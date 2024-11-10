import { Session } from "../models/Session";
import { Redis } from 'ioredis';
import axios from 'axios';
import app from '../server'; // Ensure this imports the Express app

export const checkIfUserInQueue = async (userId: string): Promise<boolean> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    // Check if the user exists in the sorted set "queue:users"
    const rank = await redisClient.zrank("queue2:users", userId);
    return rank !== null;
  } catch (error) {
    console.error("Error in checkIfUserInQueue:", error);
    throw new Error("Failed to check if user is in the queue");
  }
};

export const findSession = async (
  sessionId: string
): Promise<Session | null> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    const sessionString = await redisClient.hget(`session:sessionId`, sessionId);
    if (!sessionString) {
      return null;
    }
    return JSON.parse(sessionString);
  } catch (error) {
    console.error("Error in findSession:", error);
    throw error;
  }
};

export const findSessionIdByUser = async (
  userId: string
): Promise<string | null> => {
  const redisClient: Redis = app.locals.redisClient;
  console.log("Finding session id by user" + userId);
  try {
    const sessionId = await redisClient.hget(`session:userId`, userId);
    if (!sessionId) {
      return null;
    }
    return sessionId;
  } catch (error) {
    console.error("Error in findSessionIdByUser:", error);
    throw error;
  }
};

/*
export const findSessionByUser = async (
  userId: string
): Promise<Session | null> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    const sessionId = await findSessionIdByUser(userId);
    if (!sessionId) {
      return null;
    }
    return findSession(sessionId);
  } catch (error) {
    console.error("Error in findSessionByUser:", error);
    throw error;
  }
};
*/

export const findUserIdsBySessionId = async (
  sessionId: string
): Promise<{ userId1: string; userId2: string } | null> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    // Retrieve the session data from Redis
    const sessionData = await redisClient.hget(`session:sessionId`, sessionId);
    if (!sessionData) {
      console.log(`No session found for sessionId ${sessionId}`);
      return null;
    }

    // Parse the session JSON data
    const session: Session = JSON.parse(sessionData);

    // Return the userId1 and userId2 from the session
    return { userId1: session.userId1, userId2: session.userId2 };
  } catch (error) {
    console.error("Error in findUserIdsBySessionId:", error);
    throw error;
  }
};

export const getQueueDurationSeconds = async (
  userId: string
): Promise<number | null> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    const timeStamp = await redisClient.hget("user-timestamp", userId);
    if (!timeStamp) {
      return null;
    }
    return (Number.parseInt(timeStamp) - Date.now()) / 1000;
  } catch (error) {
    console.error("Error in getQueueDurationSeconds:", error);
    throw error;
  }
};

export const maintainQueue = async () => {
  const redisClient: Redis = app.locals.redisClient;
  const expiredTime = Date.now();
  const expiredTime15 = Date.now() + 15 * 1000;

  try {
    // Shift expired entries from queue1 to queue2
    await shiftQueue(redisClient, "queue1:*", "queue2", expiredTime15);

    // Clear expired entries from queue2
    await clearExpiredQueue(redisClient, "queue2:*", expiredTime);

    console.log("Queue maintenance completed.");
  } catch (error) {
    console.error("Error in maintainQueue:", error);
  }
};

export const shiftQueue = async (redisClient: Redis, sourcePattern: string, destinationPrefix: string, expiredTime15: number) => {
  let cursor = "0";

  try {
    do {
      // Scan for source keys (e.g., queue1 keys)
      const scanResult = await redisClient.scan(cursor, "MATCH", sourcePattern, "COUNT", 100);
      cursor = scanResult[0];
      const sourceKeys = scanResult[1];

      for (const sourceKey of sourceKeys) {
        // Extract topic or other information from the source key
        const topicAndDifficulty = sourceKey.split(":").slice(1); // Extract topic and difficulty
        const [topic] = topicAndDifficulty; // Extract only the topic part
        const destinationKey = `${destinationPrefix}:${topic}`;

        // Get expired entries from source queue
        const expiredEntries = await redisClient.zrangebyscore(sourceKey, 0, expiredTime15, "WITHSCORES");

        if (expiredEntries.length > 0) {
          const transaction = redisClient.multi();

          // Remove expired entries from the source queue
          transaction.zremrangebyscore(sourceKey, 0, expiredTime15);

          // Add expired entries to the destination queue
          for (let i = 0; i < expiredEntries.length; i += 2) {
            const userId = expiredEntries[i];
            const expiryTime = expiredEntries[i + 1];
            transaction.zadd(destinationKey, expiryTime, userId);
          }

          // Execute transaction
          try {
            await transaction.exec();
            console.log(`Shifted ${expiredEntries.length / 2} entries from ${sourceKey} to ${destinationKey}`);
          } catch (error) {
            console.error(`Error executing transaction for shifting entries from ${sourceKey} to ${destinationKey}:`, error);
          } finally {
            // Discard transaction if not executed
            transaction.discard();
          }
        }
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("Error in shiftQueue:", error);
  }
};

export const clearExpiredQueue = async (redisClient: Redis, queuePattern: string, expiredTime: number) => {
  let cursor = "0";

  try {
    do {
      // Scan for queue keys matching the pattern
      const scanResult = await redisClient.scan(cursor, "MATCH", queuePattern, "COUNT", 100);
      cursor = scanResult[0];
      const queueKeys = scanResult[1];

      if (queueKeys.length > 0) {
        const transaction = redisClient.multi();

        // Remove expired entries from each key
        for (const key of queueKeys) {
          transaction.zremrangebyscore(key, 0, expiredTime);
        }

        // Execute transaction
        try {
          const result = await transaction.exec();
          if (result) {
            const removedCount = result
              .map((res) => (typeof res === "number" ? res : 0)) // Ensure numeric results
              .reduce((acc, val) => acc + val, 0);

            console.log(`Cleared ${removedCount} expired entries from keys matching ${queuePattern}`);
          }
        } catch (error) {
          console.error(`Error executing transaction for clearing expired entries:`, error);
        } finally {
          // Discard transaction if not executed
          transaction.discard();
        }
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("Error in clearExpiredQueue:", error);
  }
};

export const enqueueUser = async (
    userId: string,
    topic: string,
    difficulty: string,
    queue_timeout_seconds: number
  ) => {
    const redisClient: Redis = app.locals.redisClient;
    const timeStamp = Date.now();
    const expiryTime = timeStamp + queue_timeout_seconds * 1000;
    let multi = redisClient.multi();
    try {
      multi.zadd("queue2:users", expiryTime, userId);
      multi.hset(`user-timestamp`, userId, expiryTime);
      multi.hset(`user-topic`, userId, topic);
      multi.hset(`user-difficulty`, userId, difficulty);
  
      multi.expire(`user-timestamp`, queue_timeout_seconds);
      multi.expire(`user-topic`, queue_timeout_seconds);
      multi.expire(`user-difficulty`, queue_timeout_seconds);
  
      multi.zadd(`queue1:${topic}:${difficulty}`, expiryTime, userId);
  
      await multi.exec();
    } catch (error) {
      console.error("Error in enqueueUser:", error);
      if (multi) {
        multi.discard();
      }
      const errorToThrow = new Error("Failed to add user to the queue in enqueueUser");
      errorToThrow.name = "enqueueUserError";
      throw error;
    }
};

export const dequeueUser = async (userId: string): Promise<void> => {
  const redisClient: Redis = app.locals.redisClient;
  const multi = redisClient.multi();

  try {
    // Retrieve the user's topic and difficulty from Redis
    const topic = await redisClient.hget("user-topic", userId);
    const difficulty = await redisClient.hget("user-difficulty", userId);

    if (!topic || !difficulty) {
      console.log(`User ${userId} not found in queue or missing topic/difficulty.`);
      return;
    }

    // Remove the user from general and topic-difficulty specific queues
    multi.zrem("queue2:users", userId);
    multi.zrem(`queue1:${topic}:${difficulty}`, userId);
    multi.zrem(`queue2:${topic}`, userId);

    // Remove user-related entries in hash sets
    multi.hdel("user-timestamp", userId);
    multi.hdel("user-topic", userId);
    multi.hdel("user-difficulty", userId);

    await multi.exec();
    console.log(`User ${userId} has been dequeued successfully.`);
  } catch (error) {
    console.error("Error in dequeueUser:", error);
    if (multi) {
      multi.discard();
    }
    throw error;
  }
};

export const saveSession = async (session: Session): Promise<void> => {
  const redisClient: Redis = app.locals.redisClient;
  const { userId1, userId2, sessionId } = session;

  //
  // Log State of all queues before a match
  //
  console.log("\n" + "Queues before match attempt");
  const queues = await redisClient.keys("queue*");
  for (const queue of queues) {
    const queueType = await redisClient.type(queue);
    if (queueType === "zset") {
      const members = await redisClient.zrange(queue, 0, -1, "WITHSCORES");
      console.log("\n" + `Queue ${queue} before match:`);
      // Print all memebers and their index in queue
      for (let i = 0; i < members.length; i += 2) {
        console.log(`User ${members[i]} at index ${i / 2}`);
      }
    }
  }

  console.log("\n" + "Sessions before match attempt");
  const sessions = await redisClient.keys("session*");
  for (const session of sessions) {
    const sessionData = await redisClient.hgetall(session);
    console.log("\n" + `Session ${session}:`);
    console.log(`${JSON.stringify(sessionData)}`)
  }

  try {
    const multi = redisClient.multi();
    multi.hset(`session:sessionId`, sessionId, JSON.stringify(session));
    multi.hset(`session:userId`, userId1, sessionId);
    multi.hset(`session:userId`, userId2, sessionId);
    // remove corresponding users from queue
    const topic = session.topic;
    const difficulty = session.difficulty;
    multi.zrem(`queue2:users`, userId1);
    multi.zrem(`queue2:users`, userId2);
    // NOTE: Zrem exectes without errors even if the user is not in the queue
    multi.zrem(`queue1:${topic}:${difficulty}`, userId1);
    multi.zrem(`queue1:${topic}:${difficulty}`, userId2);
    // NOTE: We only check session topic and difficulty
    // If users were amtched based on topic (with different difficulties), we remove them from ONLY the topic queue
    // as they have already been deleted from the topic+difficulty queue
    multi.zrem(`queue2:${topic}`, userId1);
    multi.zrem(`queue2:${topic}`, userId2);
    await multi.exec();

    //
    // Log State of all queues after a match
    //
    console.log("\n" + "Queues after match");
    const queues = await redisClient.keys("queue*");
    for (const queue of queues) {
      const queueType = await redisClient.type(queue);
      if (queueType === "zset") {
        const members = await redisClient.zrange(queue, 0, -1, "WITHSCORES");
        console.log("\n" + `Queue ${queue} after match:`);
        // Print all memebers and their index in queue
        for (let i = 0; i < members.length; i += 2) {
          console.log(`User ${members[i]} at index ${i / 2}`);
        }
      }
    }

    console.log("\n" + "Sessions after match");
    const sessions = await redisClient.keys("session*");
    for (const session of sessions) {
      const sessionData = await redisClient.hgetall(session);
      console.log("\n" + `Session ${session}:`);
      console.log(`${JSON.stringify(sessionData)}`)
    }
    } catch (error) {
      console.error("Error in saveSession:", error);
      throw error;
    }
};

const createSession = async (
  userId1: string,
  userId2: string,
  topic: string,
  difficulty: string,
  difficulty2: string
): Promise<string> =>{
  try {
    let sessionId = `${userId1}-${userId2}-${Date.now()}-Q`;
    
    // Break ties if difficulties are different, where one difficulty is "easy" and another is "hard"
    if (
      (difficulty === "easy" && difficulty2 === "hard") ||
      (difficulty === "hard" && difficulty2 === "easy")
    ) {
      difficulty = "medium";
    }

    /* RANDOM QUESTION STARTS HERE */
    const randomQuestion = await getRandomQuestionFromQuestionService(topic, difficulty);
    const randomQuestionTitle = randomQuestion;
    sessionId += randomQuestionTitle
    console.log("UPDATED Session ID:", sessionId);
    
    const session: Session = {
      sessionId: sessionId,
      userId1,
      userId2,
      topic,
      difficulty,
      timestamp: Date.now(),
    };

    await saveSession(session);
    // return sessionId as string
    // convert to string to match the return type
    return sessionId;
  } catch (error) {
    console.error("Error in createSession:", error);
    throw error;
  }
};

export const getRandomQuestionFromQuestionService = async (topic: string, difficulty: string) => {
  try {
    //const response = await axios.get(`http://localhost:8080/api/questions/random-question`, {
    const response = await axios.get(`http://question-service:8080/api/questions/random-question`, {
      params: { topic, difficulty }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching random question from question-service:', error);
    throw new Error('Failed to fetch random question from question service');
  }
};


export const deleteSession = async (
  sessionId: string
): Promise<void> => {
  const redisClient: Redis = app.locals.redisClient;
  // Find users based on sessionId
  const userIds = await findUserIdsBySessionId(sessionId);
  const userId1 = userIds?.userId1;
  const userId2 = userIds?.userId2;
  if (!userId1 || !userId2) {
    console.log(`No users found for sessionId ${sessionId}`);
    throw new Error("No users found for sessionId");
  }

  console.log(`Deleting session ${sessionId} and user1 ${userId1} and user2 ${userId2}`);

  try {
    const multi = redisClient.multi();

    // Deleting session details by sessionId
    multi.hdel("session:sessionId", sessionId);

    // Deleting the user-session mapping entries
    multi.hdel("session:userId", userId1);
    multi.hdel("session:userId", userId2);

    // Remove the user from general and topic-difficulty specific queues
    multi.zrem("queue2:users", userId1);
    multi.zrem("queue2:users", userId2);

    // Remove user-related entries in hash sets
    multi.hdel("user-timestamp", userId1);
    multi.hdel("user-topic", userId1);
    multi.hdel("user-difficulty", userId1);
    multi.hdel("user-timestamp", userId2);
    multi.hdel("user-topic", userId2);
    multi.hdel("user-difficulty", userId2);

    await multi.exec();
    console.log(`Session ${sessionId} and associated user entries deleted.`);
  } catch (error) {
    console.error("Error in deleteSession:", error);
    throw error;
  }
};

export const deleteSessionByUserId = async (userId: string): Promise<void> => {
  try {
    // Find sessionId by userId
    const sessionId = await findSessionIdByUser(userId);
    if (!sessionId) {
      console.log(`No session found for userId ${userId}`);
      return;
    }

    // Delete the session and all associated entries
    await deleteSession(sessionId);
    console.log(`Session and entries associated with userId ${userId} have been deleted.`);
  } catch (error) {
    console.error("Error in deleteSessionByUserId:", error);
    throw error;
  }
};

export const findMatchInQueueByTopic = async (
  userId: string
): Promise<String | null> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    const topic = await redisClient.hget("user-topic", userId);
    const difficulty = await redisClient.hget("user-difficulty", userId);
    if (!topic || !difficulty) {
      return null;
    }
    const matchedUsers = await redisClient.zrange(`queue2:${topic}`, 0, 2);
    if (
      matchedUsers.length === 0 || matchedUsers.length === 1 ||
      (matchedUsers.length === 2 && matchedUsers[0] === userId && matchedUsers[1] === userId)
    ) {
      return null;
    }
    const userId2 = matchedUsers[0] === userId ? matchedUsers[1] : matchedUsers[0];
    const difficulty2 = await redisClient.hget("user-difficulty", userId2);
    if (!difficulty2) {
      return null;
    }

    try {
      const sessionId = createSession(userId, userId2, topic, difficulty, difficulty2);
      return sessionId;
    } catch (error) {
        console.error("Error in createSession:", error);
        throw error;
    }
  } catch (error) {
    console.error("Error in findMatchInQueueByTopic:", error);
    throw error;
  }
};

export const findMatchInQueueByTopicAndDifficulty = async (
  userId: string
): Promise<String | null> => {
  const redisClient: Redis = app.locals.redisClient;
  try {
    const topic = await redisClient.hget("user-topic", userId);
    const difficulty = await redisClient.hget("user-difficulty", userId);
    if (!topic || !difficulty) {
      return null;
    }
    const matchedUsers = await redisClient.zrange(`queue1:${topic}:${difficulty}`, 0, 2);
    if (
      matchedUsers.length === 0 || matchedUsers.length === 1 ||
      (matchedUsers.length === 2 && matchedUsers[0] === userId && matchedUsers[1] === userId)
    ) {
      return null;
    }
    const userId2 = matchedUsers[0] === userId ? matchedUsers[1] : matchedUsers[0];
    const difficulty2 = await redisClient.hget("user-difficulty", userId2);
    if (!difficulty2) {
      return null;
    }
    try {
      const sessionId = createSession(userId, userId2, topic, difficulty, difficulty2);
      return sessionId;
    } catch (error) {
        console.error("Error in createSession:", error);
        throw error;
    }
  } catch (error) {
    console.error("Error in findMatchInQueueByTopicAndDifficulty:", error);
    throw error;
  }
};