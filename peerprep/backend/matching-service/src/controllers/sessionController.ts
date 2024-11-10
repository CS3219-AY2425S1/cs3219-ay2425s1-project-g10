import { Request, Response } from 'express';
import { cancelSession} from '../services/sessionManager';

// API to delete a session
export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.params.sessionId as string; // Get userId from URL parameters

  try {
    // Cancel the timeout and remove session from Redis
    await cancelSession(sessionId);
    res.status(200).json({ message: 'Session successfully deleted' });
  } catch (error) {
    console.error("Error in deleteSession:", error);
    res.status(500).json({ message: 'Failed to delete session due to an unknown error' });
  }
};