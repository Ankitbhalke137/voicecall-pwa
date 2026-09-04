export type CallStatus =
  | 'IDLE'
  | 'RINGING_OUTBOUND'
  | 'RINGING_INBOUND'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'TERMINATED';

export interface UserInfo {
  id: string;
  name: string;
}

export interface CallQualityMetrics {
  jitter?: number;
  packetLoss?: number;
  rtt?: number;
  qualityScore?: number;
  qualityLabel?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export type SignalingMessage =
  | { type: 'REGISTER'; userId: string }
  | { type: 'INITIATE_CALL'; targetUserId: string; callId: string }
  | { type: 'INCOMING_CALL'; callerId: string; callId: string; callerName?: string }
  | { type: 'CALL_ACCEPTED'; callId: string; targetUserId?: string; senderId?: string }
  | { type: 'CALL_REJECTED'; callId: string; targetUserId?: string; senderId?: string }
  | { type: 'CALL_PUSHED'; callId: string }
  | { type: 'SDP_OFFER'; targetUserId: string; sdp: RTCSessionDescriptionInit; senderId?: string }
  | { type: 'SDP_ANSWER'; targetUserId: string; sdp: RTCSessionDescriptionInit; senderId?: string }
  | { type: 'ICE_CANDIDATE'; targetUserId: string; candidate: RTCIceCandidateInit; senderId?: string }
  | { type: 'HANGUP'; targetUserId: string; senderId?: string; callId?: string }
  | { type: 'PRESENCE_UPDATE'; userId: string; online: boolean }
  | { type: 'QUALITY_METRICS'; targetUserId?: string; callId?: string; metrics: CallQualityMetrics }
  | { type: 'ERROR'; message: string };

export interface CallSession {
  callId: string | null;
  status: CallStatus;
  remoteUser: UserInfo | null;
  remoteStream: MediaStream | null;
  qualityMetrics?: CallQualityMetrics;
  error?: string;
}
