/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MEHFIL - Firebase Cloud Functions (Admin SDK)
 * =============================================
 * Handles privileged administrator backend operations:
 * 1. Setting custom claims for admins ({ admin: true })
 * 2. Purging user authentication records from Firebase Authentication (admin.auth().deleteUser)
 * 3. Enforcing cascade deletion across Firestore collections
 * 
 * Deployment:
 *   firebase deploy --only functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Seed primary administrator email
const ROOT_ADMIN_EMAIL = "alihassan123346600ll@gmail.com";

/**
 * Automatically assign admin claim if the user signs up with the primary admin email
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  if (user.email && user.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    await admin.firestore().collection("users").doc(user.uid).set(
      {
        role: "admin",
        isVerified: true,
      },
      { merge: true }
    );
  }
});

/**
 * Callable function to assign or revoke admin role (Requires caller to have { admin: true } claim)
 */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Verify requester is authenticated and is an admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only Mehfil administrators can grant or revoke admin roles."
    );
  }

  const { targetUid, isAdmin } = data;
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required.");
  }

  // Prevent modifying the root admin
  const targetUser = await admin.auth().getUser(targetUid);
  if (targetUser.email && targetUser.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Cannot modify root administrator credentials."
    );
  }

  await admin.auth().setCustomUserClaims(targetUid, { admin: !!isAdmin });
  await admin.firestore().collection("users").doc(targetUid).update({
    role: isAdmin ? "admin" : "user",
  });

  return { success: true };
});

/**
 * Callable function to permanently delete a user from Firebase Auth & Firestore
 */
exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only Mehfil administrators can delete accounts."
    );
  }

  const { targetUid } = data;
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "targetUid is required.");
  }

  // Prevent self-deletion or root admin deletion
  if (context.auth.uid === targetUid) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Admins cannot delete their own account from the console."
    );
  }

  const targetUser = await admin.auth().getUser(targetUid);
  if (targetUser.email && targetUser.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Root administrator account cannot be deleted."
    );
  }

  // 1. Delete Auth account
  await admin.auth().deleteUser(targetUid);

  // 2. Cascade delete from Firestore
  const db = admin.firestore();
  await db.collection("users").doc(targetUid).delete();

  // Cascade delete user's posts
  const postsSnapshot = await db.collection("posts").where("authorId", "==", targetUid).get();
  const batch = db.batch();
  postsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return { success: true };
});
