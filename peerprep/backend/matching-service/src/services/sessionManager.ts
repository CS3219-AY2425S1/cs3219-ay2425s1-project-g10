import * as redis from '../utils/redisUtils4';


// function to delete session
export const cancelSession = async (sessionId: string) => {
  try {
    await redis.deleteSession(sessionId);
  } 
  catch (error) {
    console.error('Error in cancelSession:', error);
    throw new Error("Failed to cancel the user's session");
  }
}