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

  public onStatusChange: ((status: CallStatus) => void) | null = null;
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
  }

  public waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      this.socket.onopen = () => resolve();
      this.socket.onerror = () => reject(new Error('Failed to connect to signaling server'));
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
      } else if (state === 'disconnected' && this.peerConnection?.iceConnectionState !== 'checking') {
        this.setStatus('RECONNECTING');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection?.iceConnectionState === 'failed') {
        this.handleConnectionFailure();
      }
    };

    this.peerConnection.ondatachannel = () => {};
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
    if (!this.peerConnection || !this.localStream) return;

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.send({
      type: 'SDP_OFFER',
      targetUserId: targetId,
      sdp: offer
    });
  }

  public async acceptCall(callerId: string, incomingCallId?: string): Promise<void> {
    this.targetId = callerId;
    if (incomingCallId) this.callId = incomingCallId;
    this.setStatus('RINGING_INBOUND');

    await this.waitForConnection();
    await this.initializeMedia();

    this.createPeerConnection(callerId);
    if (!this.peerConnection || !this.localStream) return;

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    this.send({ type: 'CALL_ACCEPTED', callId: this.callId || incomingCallId || '', targetUserId: callerId });
  }

  public async declineCall(callId?: string): Promise<void> {
    if (callId) {
      this.send({ type: 'CALL_REJECTED', callId, targetUserId: this.targetId! });
    } else if (this.callId) {
      this.send({ type: 'CALL_REJECTED', callId: this.callId, targetUserId: this.targetId! });
    }
    this.setStatus('IDLE');
  }

  public async handleIncomingOffer(callerId: string, offerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection || this.targetId !== callerId) {
      this.targetId = callerId;
      this.createPeerConnection(callerId);
      if (!this.localStream) {
        await this.initializeMedia();
      }
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }
    }
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.send({
      type: 'SDP_ANSWER',
      targetUserId: callerId,
      sdp: answer
    });
  }

  public hangup(): void {
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
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
          this.hangup();
          break;
        }
        case 'SDP_OFFER': {
          const sender = (msg as any).senderId || msg.targetUserId;
          await this.handleIncomingOffer(sender, msg.sdp);
          break;
        }
        case 'SDP_ANSWER':
          if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
          break;
        case 'ICE_CANDIDATE':
          if (this.peerConnection) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (err) {
              console.error('Failed to add ICE candidate:', err);
            }
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