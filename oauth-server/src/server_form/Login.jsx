import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { parseQuery, decryptText } from "./ExParams";
import logo from "../assets/igw_logo.png";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [decryptJson, setDecryptJson] = useState({});
  const data = parseQuery(searchParams);
  const { client_id, redirect_uri, scope, state } = decryptJson;

  useEffect(() => {
    (async () => {
      const decryptString = await decryptText(
        data,
        import.meta.env.VITE_ENCRIPTION_PASSWORD
      );
      setDecryptJson(JSON.parse(decryptString));
    })();
  }, []);

  return (
    <div className="h-screen flex flex-col gap-2 w-md max-w-xl mx-auto *:text-neutral-800 dark:*:text-white m-10">
      <div>
        <img
          src={logo}
          alt="GoodWorks Universal Directory"
          className="h-40 w-full rounded-md object-cover object-center"
        />
      </div>
      <form
        className="w-md max-w-xl mx-auto "
        action="oauth/login"
        method="POST"
      >
        <div className="mb-5">
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium dark:text-white"
          >
            Your email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="name@flowbite.com"
            required
          />
        </div>
        <div className="mb-5">
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium  dark:text-white"
          >
            Your password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            className="bg-gray-50 border border-gray-300text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            required
          />
        </div>
        <div className="flex items-start mb-5">
          <div className="flex items-center h-5">
            <input
              id="remember"
              type="checkbox"
              value=""
              className="w-4 h-4 border border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800"
            />
          </div>
          <label
            htmlFor="remember"
            className="ms-2 text-sm font-medium dark:text-gray-300"
          >
            Remember me
          </label>
        </div>
        <input type="hidden" name="client_id" value={client_id} />
        <input type="hidden" name="redirect_uri" value={redirect_uri} />
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="state" value={state} />

        <button
          type="submit"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
