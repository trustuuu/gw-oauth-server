// import guard from "express-jwt-permissions";

import companyService from "./src/service/company-service.js";
import { Request, Response, NextFunction } from "express";

// export const Guard = guard({
//   requestProperty: "auth",
//   permissionsProperty: "permissions",
// });

// export const RoleGuard = (requiredRoles) => {
//   return function (req, res, next) {
//     const auth = req.auth;
//     if (!auth || !auth.roles) {
//       return res.status(401).json({ error: "Unauthorized or missing roles" });
//     }
//
//     const userRoles = auth.roles;
//     const hasRole = requiredRoles.some((role) => userRoles.includes(role));
//
//     if (!hasRole) {
//       return res.status(403).json({ error: "Forbidden: insufficient roles" });
//     }
//
//     next();
//   };
// };

// Guard.js

export const Guard = {
  check: function (requiredScopes: any) {
    return function (req: any, res: Response, next: NextFunction) {
      const auth = req.auth;
      const permissions =
        auth && Array.isArray(auth.permissions) ? auth.permissions : [];
      console.log("permissions", permissions);
      const authorized = requiredScopes.some(function (scopeGroup: any) {
        if (Array.isArray(scopeGroup)) {
          // AND 모드: 그룹 안 모든 스코프를 permissions에 포함해야 함
          return scopeGroup.every(function (scope: any) {
            return permissions.includes(scope);
          });
        } else {
          // OR 모드: 하나라도 permissions에 있으면 통과
          return permissions.includes(scopeGroup);
        }
      });

      if (!authorized) {
        return res.status(403).send("Forbidden: Insufficient permissions");
      }

      next();
    };
  },

  roles: function (requiredRoles: any) {
    return function (req: any, res: Response, next: NextFunction) {
      const auth = req.auth;
      const roles = auth && Array.isArray(auth.roles) ? auth.roles : [];
      console.log("roles", roles);
      const authorized = requiredRoles.some(function (roleGroup: any) {
        if (Array.isArray(roleGroup)) {
          // AND 모드: 그룹 안 모든 롤을 roles에 포함해야 함
          return roleGroup.every(function (role: any) {
            return roles.includes(role);
          });
        } else {
          // OR 모드: 하나라도 roles에 있으면 통과
          return roles.includes(roleGroup);
        }
      });

      if (!authorized) {
        return res.status(403).send("Forbidden: Insufficient roles");
      }

      next();
    };
  },
};

export const GuardLeast = {
  check: function (requiredScopes?: any, requiredRoles?: any) {
    return async function (req: any, res: Response, next: NextFunction) {
      const auth = req.auth || {};
      console.log("req.auth", req.auth);
      console.log(
        "requiredScopes, requiredRoles",
        requiredScopes,
        requiredRoles
      );
      //Tenant Checking
      const tokenTenant = auth?.tenant_id;
      const routeTenant = req.params.id ? req.params.id : req.params.companyId;
      console.log("tokenTenant, routeTenant", tokenTenant, routeTenant);
      if (!tokenTenant) {
        return res.status(401).json({ error: "Missing tenant_id in token" });
      }

      if (req.originalUrl.endsWith("/companys") && req.method === "POST") {
        console.log(
          `Tenant checking has been passed for ${req.originalUrl} : Method: ${req.method}`
        );
      } else if (req.originalUrl.includes("/oauthapi")) {
        console.log(`Tenant checking has been passed for ${req.originalUrl}`);
        // } else if (tokenTenant && routeTenant === undefined) {
        //   console.log(`Tenant checking has been passed for ${req.originalUrl}`);
      } else if (tokenTenant !== routeTenant) {
        if (routeTenant) {
          console.log("trying company_all by routeTenant", routeTenant);
          const company_all: any = await getCompany(routeTenant);
          console.log("company_all routeTenant =>", company_all);
          if (!company_all.find((c: any) => c == tokenTenant)) {
            return res.status(403).json({
              error: `Access denied for tenant '${routeTenant}' under '${tokenTenant}'`,
            });
          }
        } else if (
          req.originalUrl.endsWith("/companys") &&
          tokenTenant &&
          req.method === "DELETE" &&
          req.body
        ) {
          console.log(
            "trying company_all by deleteTenant",
            req.originalUrl,
            req.body[0]
          );
          const company_all: any = await getCompany(req.body[0]);
          console.log("company_all deleteTenant =>", company_all);
          if (!company_all.find((c: any) => c == tokenTenant)) {
            res.status(403).json({
              error: `Access denied for tenant '${req.body[0]}' under '${tokenTenant}'`,
            });
            return;
          }
        } else {
          return res
            .status(403)
            .json({ error: `Access denied for tenant '${routeTenant}'` });
        }
      }

      //Permission checking
      const permissions = Array.isArray(auth.permissions)
        ? auth.permissions
        : [];
      //Roles checking
      const roles = Array.isArray(auth.roles) ? auth.roles : [];
      console.log("permissions, roles", permissions, roles);
      // Scope OR Role checking
      const scopesAuthorized =
        requiredScopes === undefined
          ? requiredScopes
          : !requiredScopes
          ? true
          : requiredScopes.some(function (scopeGroup: any) {
              if (Array.isArray(scopeGroup)) {
                // AND Mode: all scopes in group should includes permissions
                return scopeGroup.every(function (scope: any) {
                  console.log(
                    `permissions => ${permissions} includes scope => ${scope}`
                  );
                  return permissions.includes(scope);
                });
              } else {
                // OR Mode: one of permissions included in scope.
                console.log(
                  `permissions => ${permissions} includes scopeGroup => ${scopeGroup}`
                );
                return permissions.includes(scopeGroup);
              }
            });

      // Role OR checking
      //const rolesAuthorized = !requiredRoles
      const rolesAuthorized =
        requiredRoles === undefined
          ? requiredRoles
          : !requiredRoles
          ? true
          : requiredRoles.some(function (roleGroup: any) {
              if (Array.isArray(roleGroup)) {
                // AND mode: all roles should be included in groups.
                console.log(
                  `roleGroup => ${roleGroup} includes roles => ${roles}`
                );
                return roleGroup.every(function (role: any) {
                  return roles.includes(role);
                });
              } else {
                // OR mode: any roles inclued
                console.log(`roles => ${roles} includes roles => ${roleGroup}`);
                return roles.includes(roleGroup);
              }
            });
      console.log(
        "scopesAuthorized => ",
        scopesAuthorized,
        "rolesAuthorized => ",
        rolesAuthorized
      );
      if (
        (scopesAuthorized === true || rolesAuthorized === true) &&
        (scopesAuthorized !== false || rolesAuthorized !== false)
      ) {
        next();
      } else {
        return res
          .status(403)
          .send("Forbidden: insufficient permissions or roles");
      }
    };
  },
};
const getCompany = async (id: any, company_all: any[] = []): Promise<any> => {
  company_all.push(id);
  const company: any = await companyService.getData(id);
  console.log("company, company_all", company, company_all);
  if (company?.parent) {
    await getCompany(company.parent, company_all);
  }
  return company_all;
};
