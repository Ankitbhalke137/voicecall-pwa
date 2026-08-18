export type CallStatus =
  | 'IDLE'
  | 'RINGING_OUTBOUND'
  | 'RINGING_INBOUND'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'TERMINATED';

export type SignalingMessage =
  | { type: 'REGISTER'; userId: string }
  | { type: 'INITIATE_CALL'; targetUserId: string; callId: string }
  | { type: 'INCOMING_CALL'; callerId: string; callId: string; callerName?: string }
  | { type: 'CALL_ACCEPTED'; callId: string; targetUserId?: string; senderId?: string }
  | { type: 'CALL_REJECTED'; callId: string; targetUserId?: string; senderId?: string }
  | { type: 'SDP_OFFER'; targetUserId: string; sdp: RTCSessionDescriptionInit; senderId?: string }
  | { type: 'SDP_ANSWER'; targetUserId: string; sdp: RTCSessionDescriptionInit; senderId?: string }
  | { type: 'ICE_CANDIDATE'; targetUserId: string; candidate: RTCIceCandidateInit; senderId?: string }
  | { type: 'HANGUP'; targetUserId: string; senderId?: string }
  | { type: 'ERROR'; message: string };

export interface UserInfo {
  id: string;
  name: string;
}

export interface CallSession {
  callId: string | null;
  status: CallStatus;
  remoteUser: UserInfo | null;
  error?: string;
}