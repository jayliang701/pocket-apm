import { Config } from "../src/lib/types";
const config: Config = require(process.env.CONFIG || '../src/config');

describe("My test", () => {
    beforeAll(async () => {
        //
    });

    afterAll(async () => {
        //
    });

    test("check exception log", async () => {
        const reg = /^(\d\d\d\d\-\d\d\-\d\d\s\d\d:\d\d:\d\d(\.\d\d\d)?\s+\[.+\]\s+ERROR\s+)/;

        const line1 = '2022-04-06 20:48:45.931 [http-nio-7455-exec-6] ERROR com.ugeez.commons.security.jwt.JwtUtils - 解密Token中的公共信息出现JWTDecodeException异常:{}\n \
        com.auth0.jwt.exceptions.JWTDecodeException: The token was expected to have 3 parts, but got 1.';

        expect(reg.test(line1)).toBe(true);
        
        const line2 = '2022-04-06 20:48:45.931 [http-nio-7455-exec-6] WARN com.ugeez.commons.security.jwt.JwtUtil';

        expect(reg.test(line2)).toBe(false);
        
        const line3 = 'The token was expected to have 3 pa 2022-04-06 20:48:45.931 [http-nio-7455-exec-6] WARN com.ugeez.commons.security.jwt.JwtUtil';

        expect(reg.test(line3)).toBe(false);
    });
});
