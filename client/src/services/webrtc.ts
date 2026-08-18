import type { CallStatus, SignalingMessage, UserInfo } from '../types';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export class CallSessionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private socket: WebSocket;
  private config: WebRTCConfig;
  private myId: string;
  private targetId: string | null = null;
  private callId: string | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  public onStatusChange: ((status: CallStatus) => void) | null = null;
  public onSocketState: ((state: 'connecting' | 'open' | 'closed' | 'error') => void) | null = null;
  public onIncomingCall: ((caller: UserInfo, callId: string) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onError: ((message: string) => void) | null = null;
  public onRemoteHangup: (() => void) | null = null;

  constructor(socketUrl: string, myId: string, _myName: string) {
    this.myId = myId;
    this.socket = new WebSocket(socketUrl);
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:openrelay.metered.ca:80' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    };
    this.registerSocketEvents();
    this.socket.onopen = () => this.onSocketState?.('open');
    this.socket.onclose = () => this.onSocketState?.('closed');
    this.socket.onerror = () => this.onSocketState?.('error');
  }

  public waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const onOpen = () => {
        this.socket.removeEventListener('open', onOpen);
        resolve();
      };
      const onError = () => {
        this.socket.removeEventListener('error', onError);
        reject(new Error('Failed to connect to signaling server'));
      };
      this.socket.addEventListener('open', onOpen);
      this.socket.addEventListener('error', onError);
    });
  }

  private setStatus(status: CallStatus) {
    this.onStatusChange?.(status);
  }

  public async initializeMedia(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });
      return this.localStream;
    } catch (err) {
      console.error('Microphone Permission Denied or Device Error:', err);
      this.onError?.('Microphone permission denied. Please allow access to your microphone.');
      throw err;
    }
  }

  private createPeerConnection(_remoteId: string): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(this.config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetId) {
        this.send({
          type: 'ICE_CANDIDATE',
          targetUserId: this.targetId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.onRemoteStream?.(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.setStatus('CONNECTED');
      } else if (state === 'failed') {
        this.handleConnectionFailure();
      } else if (state === 'disconnected') {
        this.setStatus('RECONNECTING');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection?.iceConnectionState === 'failed') {
        this.handleConnectionFailure();
      }
    };

    return this.peerConnection;
  }

  private handleConnectionFailure() {
    if (!this.peerConnection) return;
    this.setStatus('RECONNECTING');
    try {
      this.peerConnection.restartIce();
    } catch (err) {
      console.error('ICE restart failed:', err);
      this.onError?.('Connection lost. Please try again.');
      this.hangup();
    }
  }

  private addLocalTracks() {
    if (!this.peerConnection || !this.localStream) return;
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });
  }

  private async flushPendingIceCandidates() {
    if (!this.peerConnection) return;
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add buffered ICE candidate:', err);
      }
    }
    this.pendingIceCandidates = [];
  }

  // ============ Outbound call ============
  public async initiateCall(targetId: string, _targetName: string): Promise<void> {
    this.targetId = targetId;
    this.callId = `call-${Date.now()}-${this.myId}`;
    this.setStatus('RINGING_OUTBOUND');

    await this.waitForConnection();
    await this.initializeMedia();

    this.send({
      type: 'INITIATE_CALL',
      targetUserId: targetId,
      callId: this.callId
    });

    this.createPeerConnection(targetId);
    this.addLocalTracks();
    if (!this.peerConnection || !this.localStream) return;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.send({
      type: 'SDP_OFFER',
      targetUserId: targetId,
      sdp: offer
    });
  }

  // ============ Inbound call ============
  public async acceptCall(callerId: string, incomingCallId?: string): Promise<void> {
    this.targetId = callerId;
    if (incomingCallId) this.callId = incomingCallId;
    this.setStatus('RINGING_INBOUND');

    await this.waitForConnection();
    await this.initializeMedia();

    this.createPeerConnection(callerId);
    this.addLocalTracks();

    if (this.pendingOffer) {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      this.send({
        type: 'SDP_ANSWER',
        targetUserId: callerId,
        sdp: answer
      });
      this.pendingOffer = null;
      await this.flushPendingIceCandidates();
    }

    this.send({ type: 'CALL_ACCEPTED', callId: this.callId || incomingCallId || '', targetUserId: callerId });
  }

  public async declineCall(callId?: string): Promise<void> {
    if (callId) {
      this.send({ type: 'CALL_REJECTED', callId, targetUserId: this.targetId! });
    } else if (this.callId) {
      this.send({ type: 'CALL_REJECTED', callId: this.callId, targetUserId: this.targetId! });
    }
    this.cleanupPending();
    this.setStatus('IDLE');
  }

  private cleanupPending() {
    this.pendingOffer = null;
    this.pendingIceCandidates = [];
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  // ============ Shared ============
  public hangup(): void {
    this.cleanupPending();
    this.remoteStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream = null;

    if (this.targetId) {
      this.send({ type: 'HANGUP', targetUserId: this.targetId });
    }
    this.targetId = null;
    this.callId = null;
    this.setStatus('TERMINATED');
    setTimeout(() => this.setStatus('IDLE'), 500);
  }

  private send(message: SignalingMessage) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private registerSocketEvents(): void {
    this.socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data) as SignalingMessage;

      switch (msg.type) {
        case 'INCOMING_CALL': {
          const caller: UserInfo = { id: msg.callerId, name: msg.callerName || `User ${msg.callerId.slice(0, 6)}` };
          this.callId = msg.callId;
          this.onIncomingCall?.(caller, msg.callId);
          break;
        }
        case 'CALL_ACCEPTED': {
          this.setStatus('RINGING_OUTBOUND');
          break;
        }
        case 'CALL_REJECTED': {
          this.onError?.('Call was declined.');
          this.cleanupPending();
          this.setStatus('IDLE');
          break;
        }
        case 'SDP_OFFER': {
          const sender = (msg as any).senderId || msg.targetUserId;
          this.targetId = sender;
          this.pendingOffer = msg.sdp;
          if (this.peerConnection && this.localStream) {
            try {
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const answer = await this.peerConnection.createAnswer();
              await this.peerConnection.setLocalDescription(answer);
              this.send({ type: 'SDP_ANSWER', targetUserId: sender, sdp: answer });
              this.pendingOffer = null;
              await this.flushPendingIceCandidates();
            } catch (err) {
              console.error('Failed to process late SDP offer:', err);
            }
          }
          break;
        }
        case 'SDP_ANSWER':
          if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
          break;
        case 'ICE_CANDIDATE':
          if (this.peerConnection && this.pendingOffer === null) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (err) {
              console.error('Failed to add ICE candidate:', err);
            }
          } else {
            this.pendingIceCandidates.push(msg.candidate);
          }
          break;
        case 'HANGUP':
          this.onRemoteHangup?.();
          break;
        case 'ERROR':
          this.onError?.(msg.message);
          break;
      }
    };

    this.socket.onclose = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        this.setStatus('RECONNECTING');
      }
    };
  }
}