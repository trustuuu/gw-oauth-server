import companyService from "../../service/company-service.js";
import { SignUpCompany, SignUpDomain, SignUpUser } from "./auth_service.js";

async function signup(req, res, routerAuth) {
  try {
    const { company, domain, user } = req.body.data;
    if (user.confirmPassword) delete user.confirmPassword;
    const existCompany = await companyService.getCompanyByName(
      company.name.replace(/\s+/g, "")
    );
    if (existCompany.length < 1) {
      user.root = true;
    }
    const newCompany = await SignUpCompany(company);
    const newDomain = await SignUpDomain(newCompany.id, domain);
    await SignUpUser(newCompany.id, newDomain.id, user);
    res.status(200).json("success");
  } catch (err) {
    res.status(500).json({ error: err });
  }
}

export default signup;
