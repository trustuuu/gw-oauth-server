import { Switch, Route } from "react-router-dom";
import Approval from "./server_form/approval";
import Login from "./server_form/Login";
import Activate from "./server_form/Activate";

export default function RouteMain() {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/approval">
        <Approval />
      </Route>
      <Route path="/activate">
        <Activate />
      </Route>
    </Switch>
  );
}
