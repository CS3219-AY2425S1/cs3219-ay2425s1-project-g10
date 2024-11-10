import { ChainableCommander } from 'ioredis';
import * as redis from '../utils/redisUtils4';

// Declare global timeout for matching
const MATCH_TIMEOUT_SECONDS = 30;

export const addToQueue = async (userId: string, topic: string, difficulty: string) => {
    //console.log("FROM Queue: USER ID IS " + userId);
    //console.log("FROM Queue: TOPIC IS " + topic);
    //console.log("FROM Queue: DIFFICULTY IS " + difficulty);
    if (!userId || !topic || !difficulty) {
      const error = new Error("Invalid input in addToQueue");
      error.name = "InvalidInputToQueueError";
      throw error;
    }
    if (await redis.checkIfUserInQueue(userId)) {
      const error = new Error("User is already in queue");
      error.name = "UserInQueueError";
      throw error;
    }
    if (await redis.findSessionIdByUser(userId)) {
      const error = new Error("User is already in a session");
      error.name = "UserInSessionError";
      throw error;
    }
    try {
      await redis.maintainQueue();
      await redis.enqueueUser(userId, topic, difficulty, MATCH_TIMEOUT_SECONDS);
    }
    catch (error) {
      const err = error as Error;

      console.error('Error in addToQueue:', error);
      throw new Error("Failed to add user to the queue due to an unknown error");
    }
};

export const removeFromQueue = async (userId: string) => {
  try {
    await redis.dequeueUser(userId);
  } 
  catch (error) {
    console.error('Error in removeFromQueue:', error);
    throw new Error("Failed to remove user from the queue due to an unknown error");
  }
};

export const findMatchInQueue = async (userId: string)  => {
  const topicTimeoutSeconds = MATCH_TIMEOUT_SECONDS / 2;
  try {
    const match = await redis.findMatchInQueueByTopicAndDifficulty(userId);
    if (match) {
      return match;
    }

    const queueDuration = await redis.getQueueDurationSeconds(userId);
    //console.log("Queue Duration: " + queueDuration);
    //console.log("Topic Timeout: " + topicTimeoutSeconds);

    if (queueDuration !== null && queueDuration < topicTimeoutSeconds - 1) {
      return redis.findMatchInQueueByTopic(userId);
    }

    return null;
  } 
  catch (error) {
    console.error('Error in findMatchInQueue:', error);
    throw new Error("Failed to find a match for the user in the queue");
  }
}