import { SignUpCompany, SignUpDomain, SignUpUser } from "./auth_service.js";

async function signup(req, res, routerAuth) {
  try {
    const { company, domain, user } = req.body.data;
    if (user.confirmPassword) delete user.confirmPassword;
    const newCompany = await SignUpCompany(company);
    const newDomain = await SignUpDomain(newCompany.id, domain);
    await SignUpUser(newCompany.id, newDomain.id, user);
    res.status(200).json("sucess");
  } catch (err) {
    res.status(500).json({ error: err });
  }
}

export default signup;
