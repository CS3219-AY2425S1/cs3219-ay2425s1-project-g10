import * as redis from '../utils/redisUtils4';
import { findMatchInQueue } from './queueManager3';

export const getStatus = async (userId: string) => {
  try {
    const sessionId = await redis.findSessionIdByUser(userId);
    if (sessionId) {
        return "Matched on Session ID: " + sessionId;
    }

    const inQueue = await redis.checkIfUserInQueue(userId);
    if (inQueue) {
      const duration = await redis.getQueueDurationSeconds(userId) || 0;
      findMatchInQueue(userId);
      return "Matching request pending: " + duration + " seconds remaining";
    }
    
    return "Matching request not in queue";
  } catch (error) {
    console.error('Error in getStatus:', error);
    throw new Error("Failed to retrieve the status of the user's match request");
  }
}