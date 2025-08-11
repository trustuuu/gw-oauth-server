import * as R from "ramda";
//const { default: R } = await import("ramda");

const pairToObj = (pair) => ({ name: pair[0], ...pair[1] });
const objToPropArray = R.pipe(R.toPairs, R.map(pairToObj));

const createCompany = (props) => ({ ...companyDefault, ...props });
const createUser = (props) => ({ ...userDefault, ...props });
const createGroup = (props) => ({ ...groupDefault, ...props });
const createComputer = (props) => ({ ...computerDefault, ...props });
const createDomain = (props) => ({ ...domainDefault, ...props });
const createProduct = (props) => ({ ...productDefault, ...props });
const createConnection = (props) => ({ ...connectionDefault, ...props });
const createSyncronization = (props) => ({
  ...syncronizationDefault,
  ...props,
});

const getCompanyProps = R.pipe(createCompany, objToPropArray);
const getUserProps = R.pipe(createUser, objToPropArray);
const getGroupProps = R.pipe(createGroup, objToPropArray);
const getComputerProps = R.pipe(createComputer, objToPropArray);
const getDomainProps = R.pipe(createDomain, objToPropArray);
const getProductProps = R.pipe(createProduct, objToPropArray);
const getConnectionProps = R.pipe(createConnection, objToPropArray);
const getSyncronizationProps = R.pipe(createSyncronization, objToPropArray);

const companyDefault = {
  name: { category: "General", friendlyName: "Name", value: "" },
};

const userDefault = {
  objectClass: { category: "General", friendlyName: "ObjectClass", value: [] },
  objectSid: { category: "General", friendlyName: "ObjectSid", value: "" },
  givenName: { category: "General", friendlyName: "First Name", value: "" },
  initials: { category: "General", friendlyName: "Initials", value: "" },
  sn: { category: "General", friendlyName: "Last Name", value: "" },
  displayName: { category: "General", friendlyName: "Display Name", value: "" },
  description: { category: "General", friendlyName: "Description", value: "" },
  physicalDeliveryOfficeName: {
    category: "General",
    friendlyName: "Office",
    value: "",
  },
  telephoneNumber: {
    category: "General",
    friendlyName: "Telephone Number",
    value: "",
  },
  otherTelephone: {
    category: "General",
    friendlyName: "Telephone Number (Other)",
    value: "",
  },
  mail: { category: "General", friendlyName: "E-mail-Addresses", value: "" },
  wWWHomePage: { category: "General", friendlyName: "Web Page", value: "" },
  url: { category: "General", friendlyName: "Web Page (Other)", value: "" },
  CN: { category: "General", friendlyName: "Common Name", value: "" },
  streetAddress: { category: "Address", friendlyName: "Street", value: "" },
  postOfficeBox: { category: "Address", friendlyName: "PO Box", value: "" },
  l: { category: "Address", friendlyName: "City", value: "" },
  st: { category: "Address", friendlyName: "State/Province", value: "" },
  postalCode: {
    category: "Address",
    friendlyName: "Zip/Postal Code",
    value: "",
  },
  c: { category: "Address", friendlyName: "Country Name", value: "" },
  memberOf: { category: "Group", friendlyName: "Group", value: "" },
  userPrincipalName: {
    category: "Account",
    friendlyName: "User Logon Name",
    value: "",
  },
  sAMAccountName: {
    category: "Account",
    friendlyName: "User Logon Name (Pre W2K)",
    value: "",
  },
  homePhone: { category: "Telephones", friendlyName: "Home", value: "" },
  otherHomePhone: {
    category: "Telephones",
    friendlyName: "Home (Other)",
    value: "",
  },
  pager: { category: "Telephones", friendlyName: "Pager", value: "" },
  otherPager: {
    category: "Telephones",
    friendlyName: "Pager (Other)",
    value: "",
  },
  mobile: { category: "Telephones", friendlyName: "Mobile", value: "" },
  otherMobile: {
    category: "Telephones",
    friendlyName: "Mobile (Other)",
    value: "",
  },
  facsimileTelephoneNumber: {
    category: "Telephones",
    friendlyName: "Fax",
    value: "",
  },
  otherFacsimile: {
    category: "Telephones",
    friendlyName: "Fax (Other)",
    value: "",
  },
  //telephoneNumber: {category: "Telephones", friendlyName: "Telephone Number", value: ""},
  ipPhone: { category: "Telephones", friendlyName: "IP Phone", value: "" },
  otherIpPhone: {
    category: "Telephones",
    friendlyName: "IP Phone (Other)",
    value: "",
  },
  info: { category: "Telephones", friendlyName: "Notes", value: "" },
  title: { category: "Organization", friendlyName: "Title", value: "" },
  department: {
    category: "Organization",
    friendlyName: "Department",
    value: "",
  },
  company: { category: "Organization", friendlyName: "Company", value: "" },
  manager: { category: "Organization", friendlyName: "Manager", value: "" },
  employeeID: {
    category: "Organization",
    friendlyName: "Employee ID",
    value: "",
  },
  employeeType: {
    category: "Organization",
    friendlyName: "Employee Type",
    value: "",
  },
  employeeNumber: {
    category: "Organization",
    friendlyName: "Employee Number",
    value: "",
  },
  carLicense: {
    category: "Organization",
    friendlyName: "Car License",
    value: "",
  },
  division: { category: "Organization", friendlyName: "Division", value: "" },
  roomNumber: {
    category: "Organization",
    friendlyName: "Room Number",
    value: "",
  },
  mailNickname: { category: "Exchange", friendlyName: "Alias", value: "" },
  displayNamePrintable: {
    category: "Exchange",
    friendlyName: "Simple Display Name",
    value: "",
  },
  proxyAddresses: {
    category: "Exchange",
    friendlyName: "Email addresses",
    value: [],
  },
  extensionAttribute1: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute1",
    value: "",
  },
  extensionAttribute2: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute2",
    value: "",
  },
  extensionAttribute3: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute3",
    value: "",
  },
  extensionAttribute4: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute4",
    value: "",
  },
  extensionAttribute5: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute5",
    value: "",
  },
  extensionAttribute6: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute6",
    value: "",
  },
  extensionAttribute7: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute7",
    value: "",
  },
  extensionAttribute8: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute8",
    value: "",
  },
  extensionAttribute9: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute9",
    value: "",
  },
  extensionAttribute10: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute10",
    value: "",
  },
  extensionAttribute11: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute11",
    value: "",
  },
  extensionAttribute12: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute12",
    value: "",
  },
  extensionAttribute13: {
    category: "Exchange Attributes",
    friendlyName: "extensionAttribute13",
    value: "",
  },
};

const groupDefault = {
  name: { category: "General", friendlyName: "Name", value: "" },
  cn: { category: "General", friendlyName: "Common Name", value: "" },
  member: { category: "General", friendlyName: "Member", value: "" },
  groupType: { category: "General", friendlyName: "Group Type", value: "" },
  memberOf: { category: "General", friendlyName: "MemberOf", value: [] },
  objectGUID: { category: "General", friendlyName: "ObjectGUID", value: "" },
  objectSid: { category: "General", friendlyName: "ObjectSid", value: "" },
  sAMAccountName: {
    category: "General",
    friendlyName: "sAMAccountName",
    value: "",
  },
};

const computerDefault = {
  name: { category: "General", friendlyName: "Name", value: "" },
};

const domainDefault = {
  name: { category: "General", friendlyName: "Name", value: "" },
};

const productDefault = {
  OU: { category: "General", value: "" },
  adminID: { category: "General", value: "" },
  adminPW: { category: "General", value: "" },
  domainName: { category: "General", value: "" },
  subTree: { category: "General", value: true },
  syncPW: { category: "General", value: true },
  syncProperties: { category: "General", value: true },
  targetKey: { category: "General", value: "" },
  properties: { category: "Properties", type: "properties", value: [] },
};

const connectionDefault = {
  name: { category: "General", friendlyName: "Name", value: "" },
};

const syncronizationDefault = {
  name: { category: "General", friendlyName: "Name", value: "" },
};

export {
  createCompany,
  createUser,
  createGroup,
  createComputer,
  createDomain,
  createProduct,
  createConnection,
  createSyncronization,
  getCompanyProps,
  getUserProps,
  getGroupProps,
  getComputerProps,
  getDomainProps,
  getProductProps,
  getConnectionProps,
  getSyncronizationProps,
};
