/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { AssignUserRoleRequest, AssignUserRoleResponse, CreateRolePolicyRuleRequest, CreateRolePolicyRuleResponse, DeleteRolePolicyRuleRequest, DeleteRolePolicyRuleResponse, ListRolePolicyRulesRequest, ListRolePolicyRulesResponse, ListUserEffectivePermissionsRequest, ListUserEffectivePermissionsResponse, ListUserRolesRequest, ListUserRolesResponse, RemoveUserRoleRequest, RemoveUserRoleResponse, UpdateRolePolicyRuleRequest, UpdateRolePolicyRuleResponse } from "./types.gen.js";

export interface SecurityApi {
  assignUserRole(input: AssignUserRoleRequest, options?: SdkRequestOverrides): Promise<AssignUserRoleResponse>;
  createRolePolicyRule(input: CreateRolePolicyRuleRequest, options?: SdkRequestOverrides): Promise<CreateRolePolicyRuleResponse>;
  deleteRolePolicyRule(input: DeleteRolePolicyRuleRequest, options?: SdkRequestOverrides): Promise<DeleteRolePolicyRuleResponse>;
  listRolePolicyRules(input: ListRolePolicyRulesRequest, options?: SdkRequestOverrides): Promise<ListRolePolicyRulesResponse>;
  listUserEffectivePermissions(input: ListUserEffectivePermissionsRequest, options?: SdkRequestOverrides): Promise<ListUserEffectivePermissionsResponse>;
  listUserRoles(input: ListUserRolesRequest, options?: SdkRequestOverrides): Promise<ListUserRolesResponse>;
  removeUserRole(input: RemoveUserRoleRequest, options?: SdkRequestOverrides): Promise<RemoveUserRoleResponse>;
  updateRolePolicyRule(input: UpdateRolePolicyRuleRequest, options?: SdkRequestOverrides): Promise<UpdateRolePolicyRuleResponse>;
}

export function createSecurityApi(client: CmsSdkClientCore): SecurityApi {
  return {
    assignUserRole: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/users/:id/roles",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    createRolePolicyRule: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/roles/:roleCode/policy-rules",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    deleteRolePolicyRule: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/roles/:roleCode/policy-rules/:ruleId",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listRolePolicyRules: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/roles/:roleCode/policy-rules",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listUserEffectivePermissions: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/users/:id/permissions",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listUserRoles: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/users/:id/roles",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    removeUserRole: async (input, options) =>
      client.request({
        method: "DELETE",
        path: "/v1/users/:id/roles/:roleCode",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    updateRolePolicyRule: async (input, options) =>
      client.request({
        method: "PATCH",
        path: "/v1/roles/:roleCode/policy-rules/:ruleId",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
