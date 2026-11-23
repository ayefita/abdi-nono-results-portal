import { apiSession } from "@/lib/api";
import { studentTemplate } from "@/lib/excel";
import { xlsxResponse } from "@/lib/pdf";

export async function GET() {
  const { session, response } = await apiSession(["ADMIN"]);
  if (!session) return response;
  return xlsxResponse(studentTemplate(), "ifa-boru-students.xlsx");
}
