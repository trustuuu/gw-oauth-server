import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { parseQuery, decryptText } from "./ExParams";
import logo from "../assets/igw_logo.png";

export default function Approve() {
  const [searchParams] = useSearchParams();
  const [decryptJson, setDecryptJson] = useState({});
  const data = parseQuery(searchParams);
  const { reqid, scope, client, email } = decryptJson;
  const [isAgree, setIsAgree] = useState(false);

  useEffect(() => {
    (async () => {
      const decryptString = await decryptText(
        data,
        import.meta.env.VITE_ENCRIPTION_PASSWORD
      );
      setDecryptJson(JSON.parse(decryptString));
    })();
  }, [data]);

  const handleChange = () => {
    setIsAgree(!isAgree);
  };

  return (
    <>
      {!email ? null : (
        <div className="h-screen flex flex-col gap-2 w-md max-w-xl mx-auto *:text-neutral-800 dark:*:text-white m-10">
          <div>
            <img
              src={logo}
              alt="GoodWorks Universal Directory"
              className="h-40 w-full rounded-md object-cover object-center"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span>
              Hi <code>{email}</code> ,{" "}
            </span>

            <span>
              <code>{client.client_name}</code> is requesting access to your
              igoodworks account
            </span>
            {scope ? (
              <div className="flex flex-col gap-2 items-center justify-center dark:bg-amber-400">
                <span className="flex w-full p-2 justify-center bg-amber-600 text-xl font-semibold ">
                  Scopes
                </span>
                <ul className="*:text-lg">
                  {scope.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <form
            className="w-md max-w-xl mx-auto"
            action="oauth/approve"
            method="POST"
          >
            <div className="flex items-start mb-5">
              <div className="flex items-center h-5">
                <input
                  id="agree"
                  type="checkbox"
                  checked={isAgree}
                  onChange={handleChange}
                  className="w-4 h-4 border border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800"
                />
              </div>
              <label
                htmlFor="agree"
                className="ms-2 text-sm font-medium dark:text-gray-300"
              >
                Agree
              </label>
            </div>
            <input type="hidden" name="reqid" value={reqid} />
            <input type="hidden" name="email" value={email} />

            <button
              disabled={!isAgree}
              type="submit"
              name="approve"
              value="Approve"
              className={`${
                !isAgree ? "opacity-50 cursor-not-allowed" : ""
              } text-white  bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm
              sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800`}
            >
              Submit
            </button>
          </form>
        </div>
      )}
    </>
  );
}
