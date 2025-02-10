import { JsonController, Post, Get, Body, Param, UseBefore, CurrentUser, HttpError } from 'routing-controllers';
import { CallService } from '../services/CallService';
import { Call, CallType } from '../models/CallModel';
import { authMiddleware } from '../middleware/auth';

interface InitiateCallRequest {
  receiverId: string;
  type: CallType;
}

interface AcceptCallRequest {
  sdpAnswer: string;
}

interface IceCandidatesRequest {
  candidates: string[];
}

@JsonController('/api/v1/calls')
@UseBefore(authMiddleware)
export class CallController {
  constructor(private callService: CallService) {}

  @Post('/')
  async initiateCall(
    @CurrentUser() userId: string,
    @Body() body: InitiateCallRequest
  ): Promise<Call> {
    try {
      return await this.callService.initiateCall(userId, body.receiverId, body.type);
    } catch (error) {
      throw new HttpError(400, 'Failed to initiate call');
    }
  }

  @Post('/:callId/accept')
  async acceptCall(
    @CurrentUser() userId: string,
    @Param('callId') callId: string,
    @Body() body: AcceptCallRequest
  ): Promise<Call> {
    try {
      const call = await this.callService.acceptCall(callId, body.sdpAnswer);
      if (call.receiverId !== userId) {
        throw new HttpError(403, 'Not authorized to accept this call');
      }
      return call;
    } catch (error) {
      throw new HttpError(400, 'Failed to accept call');
    }
  }

  @Post('/:callId/reject')
  async rejectCall(
    @CurrentUser() userId: string,
    @Param('callId') callId: string
  ): Promise<Call> {
    try {
      const call = await this.callService.rejectCall(callId);
      if (call.receiverId !== userId) {
        throw new HttpError(403, 'Not authorized to reject this call');
      }
      return call;
    } catch (error) {
      throw new HttpError(400, 'Failed to reject call');
    }
  }

  @Post('/:callId/end')
  async endCall(
    @CurrentUser() userId: string,
    @Param('callId') callId: string
  ): Promise<Call> {
    try {
      const call = await this.callService.endCall(callId);
      if (call.callerId !== userId && call.receiverId !== userId) {
        throw new HttpError(403, 'Not authorized to end this call');
      }
      return call;
    } catch (error) {
      throw new HttpError(400, 'Failed to end call');
    }
  }

  @Post('/:callId/ice-candidates')
  async updateIceCandidates(
    @CurrentUser() userId: string,
    @Param('callId') callId: string,
    @Body() body: IceCandidatesRequest
  ): Promise<Call> {
    try {
      const call = await this.callService.updateIceCandidates(callId, body.candidates);
      if (call.callerId !== userId && call.receiverId !== userId) {
        throw new HttpError(403, 'Not authorized to update this call');
      }
      return call;
    } catch (error) {
      throw new HttpError(400, 'Failed to update ICE candidates');
    }
  }

  @Get('/history')
  async getCallHistory(@CurrentUser() userId: string): Promise<Call[]> {
    try {
      return await this.callService.getCallHistory(userId);
    } catch (error) {
      throw new HttpError(400, 'Failed to get call history');
    }
  }

  @Get('/active')
  async getActiveCall(@CurrentUser() userId: string): Promise<Call | null> {
    try {
      return await this.callService.getActiveCall(userId);
    } catch (error) {
      throw new HttpError(400, 'Failed to get active call');
    }
  }
} 