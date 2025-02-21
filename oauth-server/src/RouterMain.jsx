import { Switch, Route } from "react-router-dom";
import Approval from "./server_form/approval";
import Login from "./server_form/Login";

export default function RouteMain() {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/approval">
        <Approval />
      </Route>
    </Switch>
  );
}
