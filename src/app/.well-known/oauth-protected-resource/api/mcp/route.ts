import { connection } from "next/server";
import { auth } from "@/lib/auth";

export const GET = async (request: Request) => {
  // Without this the build may try to prerender a route that reads the request.
  await connection();
  return auth.handler(request);
};
