import { Request, Response } from 'express';
import { createQuestion } from './controllers/questionController';
import Question from './models/questionModel';
/*
   {
      questionId: 6,
      title: 'Implement Stack using Queues',
      description: `Implement a last-in-first-out (LIFO) stack using only two queues. The implemented stack should support all the functions of a normal stack (push, top, pop, and empty).`,
      categories: 'Data Structures',
      difficulty: 'easy',
    },
    {
      questionId: 7,
      title: 'Combine Two Tables',
      description: `Given table Person with the following columns: personId, lastName, firstName. And table Address with the following columns: addressId, personId, city, state. Write a solution to report the first name, last name, city, and state of each person.`,
      categories: 'Databases',
      difficulty: 'easy',
    },
    {
        questionId: 12,
        title: 'Rotate Image',
        description: `You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise).`,
        categories: 'Arrays, Algorithms',
        difficulty: 'medium',
    },
    {
        questionId: 13,
        title: 'Airplane Seat Assignment Probability',
        description: `n passengers board an airplane with exactly n seats. The first passenger has lost the ticket and picks a seat randomly. After that, the rest of the passengers will: take their own seat if it is still available, or pick other seats randomly if their seat is taken. Return the probability that the nth person gets their own seat.`,
        categories: 'Brainteaser',
        difficulty: 'medium',
    },
    {
        questionId: 19,
        title: 'Chalkboard XOR Game',
        description: `You are given an array of integers representing numbers written on a chalkboard. Alice and Bob take turns erasing exactly one number from the chalkboard. Return true if and only if Alice wins the game, assuming both players play optimally.`,
        categories: 'Brainteaser',
        difficulty: 'hard',
    },
    {
        questionId: 18,
        title: 'Wildcard Matching',
        description: `Given an input string (s) and a pattern (p), implement wildcard pattern matching with support for '?' and '*' where:
        - '?' matches any single character.
        - '*' matches any sequence of characters (including the empty sequence).
        
        The matching should cover the entire input string (not partial).`,
        categories: 'Strings, Algorithms',
        difficulty: 'hard',
    }
*/

const sampleQuestions = [
  {
    title: 'Reverse a String',
    description: `Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.
      Example 1:
      Input: s = ["h","e","l","l","o"]
      Output: ["o","l","l","e","h"]
  
      Example 2:
      Input: s = ["H","a","n","n","a","h"]
      Output: ["h","a","n","n","a","H"]
  
      Constraints:
      1 <= s.length <= 105
      s[i] is a printable ascii character.`,
    categories: 'Strings, Algorithms',
    difficulty: 'easy',
  },
  {
    title: 'Linked List Cycle Detection',
    description: `Implement a function to detect if a linked list contains a cycle.`,
    categories: 'Data Structures, Algorithms',
    difficulty: 'easy',
  },
  {
    title: 'Roman to Integer',
    description: `Given a roman numeral, convert it to an integer.`,
    categories: 'Algorithms',
    difficulty: 'easy',
  },
  {
    title: 'Add Binary',
    description: `Given two binary strings a and b, return their sum as a binary string.`,
    categories: 'Bit Manipulation, Algorithms',
    difficulty: 'easy',
  },
  {
    title: 'Fibonacci Number',
    description: `The Fibonacci numbers, commonly denoted F(n) form a sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is, F(0) = 0, F(1) = 1 F(n) = F(n - 1) + F(n - 2), for n > 1. Given n, calculate F(n).`,
    categories: 'Recursion, Algorithms',
    difficulty: 'easy',
  },
  {
    title: 'Repeated DNA Sequences',
    description: `Given a string s that represents a DNA sequence, return all the 10-letter-long sequences (substrings) that occur more than once in a DNA molecule.`,
    categories: 'Algorithms, Bit Manipulation',
    difficulty: 'medium',
  },
  {
    title: 'Course Schedule',
    description: `There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses.`,
    categories: 'Data Structures, Algorithms',
    difficulty: 'medium',
  },
  {
    title: 'LRU Cache Design',
    description: `Design and implement an LRU (Least Recently Used) cache.`,
    categories: 'Data Structures',
    difficulty: 'medium',
  },
  {
    title: 'Longest Common Subsequence',
    description: `Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.
  
      A subsequence of a string is a new string generated from the original string with some characters deleted without changing the relative order of the remaining characters.`,
    categories: 'Strings, Algorithms',
    difficulty: 'medium',
  },
  {
    title: 'Validate Binary Search Tree',
    description: `Given the root of a binary tree, determine if it is a valid binary search tree (BST).`,
    categories: 'Data Structures, Algorithms',
    difficulty: 'medium',
  },
  {
    title: 'Sliding Window Maximum',
    description: `You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position, return the maximum sliding window.`,
    categories: 'Arrays, Algorithms',
    difficulty: 'hard',
  },
  {
    title: 'N-Queen Problem',
    description: `The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle.`,
    categories: 'Algorithms',
    difficulty: 'hard',
  },
  {
    title: 'Serialize and Deserialize a Binary Tree',
    description: `Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection. Design an algorithm to serialize and deserialize a binary tree.`,
    categories: 'Data Structures, Algorithms',
    difficulty: 'hard',
  },
  {
    title: 'Trips and Users',
    description: `Given table Trips with columns id, client_id, driver_id, city_id, status, request_at, and table Users with columns users_id, banned, role, write a solution to find the cancellation rate of requests with unbanned users (both client and driver must not be banned) between specific dates.`,
    categories: 'Databases',
    difficulty: 'hard',
  },
];

// Create a helper function to simulate the Express request-response cycle
const simulateCreateQuestion = async (question: any) => {
  return new Promise((resolve, reject) => {
    // Simulating the request object
    const req = {
      body: question,
    } as Request;

    // Simulating the response object
    const res = {
      status: (code: number) => {
        return {
          json: (data: any) => {
            if (code === 201) {
              resolve(data); // Successfully created question
            } else {
              reject(data); // Handle error response
            }
          },
        };
      },
    } as Response;

    createQuestion(req, res);
  });
};

const loadSampleData = async () => {
  try {
    // Check if data already exists
    const count = await Question.countDocuments();
    if (count === 0) {
      // Insert sample data if the collection is empty
      for (const question of sampleQuestions) {
        await simulateCreateQuestion(question);
      }
      console.log('Sample data loaded');
    } else {
      console.log('Data already exists, skipping seed');
    }
  } catch (error) {
    console.error('Error loading sample data', error);
  }
};

export default loadSampleData;