import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {BaseActivity} from "./activityTypes";

// Get Firestore instance
const getDb = () => admin.firestore();

/**
 * Log an activity to the activities collection
 * @param activity - The activity data to log
 * @returns Promise that resolves when activity is logged
 */
export async function logActivity(activity: BaseActivity): Promise<void> {
  try {
    const db = getDb();
    const activityRef = db.collection("activities").doc();
    
    await activityRef.set({
      ...activity,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    functions.logger.info(`Activity logged: ${activity.type}`, {
      actorId: activity.actorId,
      targetId: activity.targetId,
      orgId: activity.orgId,
    });
  } catch (error) {
    // Log error but don't throw - activity logging should not break main functionality
    functions.logger.error("Failed to log activity:", error, {
      activityType: activity.type,
      actorId: activity.actorId,
    });
  }
}

/**
 * Configuration for activity logging on a cloud function
 */
export interface ActivityConfig<T = any> {
  /**
   * Generate activity data from the request and result
   * Return null to skip logging
   */
  getActivity: (
    request: functions.https.CallableRequest<T>,
    result: any,
    error?: any
  ) => BaseActivity | null | Promise<BaseActivity | null>;
  
  /**
   * Whether to log on error (default: false)
   */
  logOnError?: boolean;
}

/**
 * Wrapper for callable functions that automatically logs activities
 * @param handler - The function handler
 * @param activityConfig - Configuration for activity logging
 * @returns Wrapped callable function
 */
export function callableWithActivity<T = any>(
  handler: (request: functions.https.CallableRequest<T>) => Promise<any>,
  activityConfig?: ActivityConfig<T>
) {
  return functions.https.onCall(async (request: functions.https.CallableRequest<T>) => {
    let result: any;
    let error: any;
    
    try {
      result = await handler(request);
      
      // Log successful activity if config provided
      if (activityConfig) {
        try {
          const activity = await activityConfig.getActivity(request, result);
          if (activity) {
            await logActivity(activity);
          }
        } catch (activityError) {
          functions.logger.warn("Failed to generate activity log:", activityError);
        }
      }
      
      return result;
    } catch (err) {
      error = err;
      
      // Log error activity if configured
      if (activityConfig?.logOnError) {
        try {
          const activity = await activityConfig.getActivity(request, result, error);
          if (activity) {
            await logActivity(activity);
          }
        } catch (activityError) {
          functions.logger.warn("Failed to generate error activity log:", activityError);
        }
      }
      
      throw err;
    }
  });
}

/**
 * Helper to get user display name from Firestore
 */
export async function getUserDisplayName(userId: string, collection: "users" | "trainers" = "users"): Promise<string> {
  try {
    const db = getDb();
    const userDoc = await db.collection(collection).doc(userId).get();
    
    if (!userDoc.exists) {
      return "Unknown User";
    }
    
    const userData = userDoc.data();
    if (!userData) {
      return "Unknown User";
    }
    
    const firstName = userData.firstName || "";
    const lastName = userData.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    
    return fullName || userData.email || "Unknown User";
  } catch (error) {
    functions.logger.warn(`Failed to fetch user name for ${userId}:`, error);
    return "Unknown User";
  }
}

/**
 * Helper to get trainer display name from Firestore
 */
export async function getTrainerDisplayName(trainerId: string): Promise<string> {
  return getUserDisplayName(trainerId, "trainers");
}
