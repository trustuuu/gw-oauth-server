import randomstring from "randomstring";
import { getUserRef } from "./auth_service.js";
import codeService from "../../service/code-service.js";
import { buildUrl } from "../../helper/utils.js";

export const generateCodeUrlBuild = async (
  request,
  email,
  scope,
  code_challenge,
  code_challenge_method
) => {
  const user = await getUserRef(email);

  const code = randomstring.generate(8);
  const data = {
    request,
    user: { ...user, authVerification: null },
    scope,
    code_challenge,
    code_challenge_method,
    whenCreated: new Date(),
    status: "issued",
  };
  const authId = "authorization";
  await codeService.setData.apply(codeService, [data].concat([authId, code]));

  const urlParsed = buildUrl(request.redirect_uri, {
    code: code,
    state: request.state,
  });

  return urlParsed;
};
