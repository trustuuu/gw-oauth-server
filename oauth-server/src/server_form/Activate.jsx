import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import logo from "../assets/igw_logo.png";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const user_code = searchParams.get("user_code");
  const [isApprove, setIsApprove] = useState(false);

  const handleChange = () => {
    setIsApprove(!isApprove);
  };

  return (
    <>
      {!user_code ? null : (
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
              <code>Device is going to activate with the code {user_code}</code>
            </span>
          </div>

          <form
            className="w-md max-w-xl mx-auto"
            action="oauth/v1/activate"
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
            <div className="flex items-start mb-5">
              <div className="flex items-center h-5">
                <input
                  id="agree"
                  type="checkbox"
                  checked={isApprove}
                  onChange={handleChange}
                  className="w-4 h-4 border border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800"
                />
              </div>
              <label
                htmlFor="agree"
                className="ms-2 text-sm font-medium dark:text-gray-300"
              >
                Approved
              </label>
            </div>
            <input type="hidden" name="user_code" value={user_code} />
            <input
              type="hidden"
              name="grant_type"
              value="urn:ietf:params:oauth:grant-type:device_code"
            />

            <button
              disabled={!isApprove}
              type="submit"
              name="activate"
              value="Activate"
              className={`${
                !isApprove ? "opacity-50 cursor-not-allowed" : ""
              } text-white  bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm
              sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800`}
            >
              Activate
            </button>
          </form>
        </div>
      )}
    </>
  );
}
