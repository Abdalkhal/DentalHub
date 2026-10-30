import { expect, it } from "vitest";
import { dataUrlToBytes } from "./uploadData";

it("decodes a base64 data URL to its bytes and type", () => {
  const { bytes, contentType } = dataUrlToBytes("data:image/jpeg;base64,/9j/AA==");
  expect(contentType).toBe("image/jpeg");
  expect([...bytes]).toEqual([0xff, 0xd8, 0xff, 0x00]);
});
