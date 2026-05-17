// Set active=true while the password-reset screen owns the auth session so
// _layout.tsx's resolveRoute doesn't navigate away during the recovery window
// (PASSWORD_RECOVERY and USER_UPDATED both fire before signOut completes).
export const recovery = { active: false };
