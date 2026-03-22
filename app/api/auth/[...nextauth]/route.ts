// ---------------------------------------------------------------------------
// NextAuth v5 – Route Handler
//
// Delegates all GET and POST requests to the NextAuth handlers configured in
// @/lib/auth.  This file must live at app/api/auth/[...nextauth]/route.ts for
// the Auth.js catchall route to work correctly.
// ---------------------------------------------------------------------------

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
