export const GHOSTPAY_ADDRESS = "0xf8165A4d46eAe205689f357B12Be2983d24e6612" as const;

export const GHOSTPAY_ABI = [
  {
    type: "constructor",
    inputs: [],
  },
  {
    type: "function",
    name: "addEmployee",
    inputs: [
      { name: "employee", type: "address" },
      {
        name: "salary",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
      {
        name: "bonus",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "payEmployee",
    inputs: [
      { name: "employee", type: "address" },
      {
        name: "amount",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeEmployee",
    inputs: [{ name: "employee", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getEmployeeList",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEmployeeCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEmployeeData",
    inputs: [{ name: "employee", type: "address" }],
    outputs: [
      { name: "salary", type: "bytes32" },
      { name: "bonus", type: "bytes32" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalPaid",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isEmployee",
    inputs: [{ name: "employee", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "employees",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "salary", type: "bytes32" },
      { name: "bonus", type: "bytes32" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "employeeList",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalPaid",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "EmployeeAdded",
    inputs: [{ name: "employee", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "EmployeePaid",
    inputs: [
      { name: "employee", type: "address", indexed: true },
      { name: "amount", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EmployeeRemoved",
    inputs: [{ name: "employee", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true },
      { name: "newOwner", type: "address", indexed: true },
    ],
  },
] as const;

export interface InEuint32 {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
}
