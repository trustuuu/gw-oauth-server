// import guard from "express-jwt-permissions";

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

//     const userRoles = auth.roles;
//     const hasRole = requiredRoles.some((role) => userRoles.includes(role));

//     if (!hasRole) {
//       return res.status(403).json({ error: "Forbidden: insufficient roles" });
//     }

//     next();
//   };
// };

// Guard.js

export const Guard = {
  check: function (requiredScopes) {
    return function (req, res, next) {
      const auth = req.auth;
      const permissions =
        auth && Array.isArray(auth.permissions) ? auth.permissions : [];

      const authorized = requiredScopes.some(function (scopeGroup) {
        if (Array.isArray(scopeGroup)) {
          // AND 모드: 그룹 안 모든 스코프를 permissions에 포함해야 함
          return scopeGroup.every(function (scope) {
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

  roles: function (requiredRoles) {
    return function (req, res, next) {
      const auth = req.auth;
      const roles = auth && Array.isArray(auth.roles) ? auth.roles : [];

      const authorized = requiredRoles.some(function (roleGroup) {
        if (Array.isArray(roleGroup)) {
          // AND 모드: 그룹 안 모든 롤을 roles에 포함해야 함
          return roleGroup.every(function (role) {
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
  check: function (requiredScopes, requiredRoles) {
    return function (req, res, next) {
      const auth = req.auth || {};

      const permissions = Array.isArray(auth.permissions)
        ? auth.permissions
        : [];
      const roles = Array.isArray(auth.roles) ? auth.roles : [];
      // 스코프 OR 로 체크
      //      const scopesAuthorized = !requiredScopes
      // console.log(
      //   "requiredScopes, requiredRoles, permissions, roles",
      //   requiredScopes,
      //   requiredRoles,
      //   permissions,
      //   roles
      // );
      const scopesAuthorized =
        requiredScopes === undefined
          ? requiredScopes
          : !requiredScopes
          ? true
          : requiredScopes.some(function (scopeGroup) {
              if (Array.isArray(scopeGroup)) {
                // AND 모드: 그룹 안 모든 스코프를 permissions에 포함해야 함
                return scopeGroup.every(function (scope) {
                  return permissions.includes(scope);
                });
              } else {
                // OR 모드: 하나라도 permissions에 있으면 통과
                return permissions.includes(scopeGroup);
              }
            });

      // 롤 OR 로 체크
      //const rolesAuthorized = !requiredRoles
      const rolesAuthorized =
        requiredRoles === undefined
          ? requiredRoles
          : !requiredRoles
          ? true
          : requiredRoles.some(function (roleGroup) {
              if (Array.isArray(roleGroup)) {
                // AND 모드: 그룹 안 모든 롤을 roles에 포함해야 함
                return roleGroup.every(function (role) {
                  return roles.includes(role);
                });
              } else {
                // OR 모드: 하나라도 roles에 있으면 통과
                return roles.includes(roleGroup);
              }
            });
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
