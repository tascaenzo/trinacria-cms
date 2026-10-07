/* eslint-disable */
// Auto-generated from OpenAPI. Do not edit by hand.

import type { CmsSdkClientCore, SdkRequestOverrides } from "../runtime/types.js";
import type { ApprovePluginGrantRequest, ApprovePluginGrantResponse, AssignUserRoleRequest, AssignUserRoleResponse, CreateRolePolicyRuleRequest, CreateRolePolicyRuleResponse, DeleteRolePolicyRuleRequest, DeleteRolePolicyRuleResponse, DenyPluginGrantRequest, DenyPluginGrantResponse, GetPluginGrantRequest, GetPluginGrantResponse, ListPluginGrantsRequest, ListPluginGrantsResponse, ListRolePolicyRulesRequest, ListRolePolicyRulesResponse, ListSecurityAuditRequest, ListSecurityAuditResponse, ListUserEffectivePermissionsRequest, ListUserEffectivePermissionsResponse, ListUserRolesRequest, ListUserRolesResponse, RemoveUserRoleRequest, RemoveUserRoleResponse, RevokePluginGrantRequest, RevokePluginGrantResponse, UpdateRolePolicyRuleRequest, UpdateRolePolicyRuleResponse } from "./types.gen.js";

export interface SecurityApi {
  approvePluginGrant(input: ApprovePluginGrantRequest, options?: SdkRequestOverrides): Promise<ApprovePluginGrantResponse>;
  assignUserRole(input: AssignUserRoleRequest, options?: SdkRequestOverrides): Promise<AssignUserRoleResponse>;
  createRolePolicyRule(input: CreateRolePolicyRuleRequest, options?: SdkRequestOverrides): Promise<CreateRolePolicyRuleResponse>;
  deleteRolePolicyRule(input: DeleteRolePolicyRuleRequest, options?: SdkRequestOverrides): Promise<DeleteRolePolicyRuleResponse>;
  denyPluginGrant(input: DenyPluginGrantRequest, options?: SdkRequestOverrides): Promise<DenyPluginGrantResponse>;
  getPluginGrant(input: GetPluginGrantRequest, options?: SdkRequestOverrides): Promise<GetPluginGrantResponse>;
  listPluginGrants(input?: ListPluginGrantsRequest, options?: SdkRequestOverrides): Promise<ListPluginGrantsResponse>;
  listRolePolicyRules(input: ListRolePolicyRulesRequest, options?: SdkRequestOverrides): Promise<ListRolePolicyRulesResponse>;
  listSecurityAudit(input?: ListSecurityAuditRequest, options?: SdkRequestOverrides): Promise<ListSecurityAuditResponse>;
  listUserEffectivePermissions(input: ListUserEffectivePermissionsRequest, options?: SdkRequestOverrides): Promise<ListUserEffectivePermissionsResponse>;
  listUserRoles(input: ListUserRolesRequest, options?: SdkRequestOverrides): Promise<ListUserRolesResponse>;
  removeUserRole(input: RemoveUserRoleRequest, options?: SdkRequestOverrides): Promise<RemoveUserRoleResponse>;
  revokePluginGrant(input: RevokePluginGrantRequest, options?: SdkRequestOverrides): Promise<RevokePluginGrantResponse>;
  updateRolePolicyRule(input: UpdateRolePolicyRuleRequest, options?: SdkRequestOverrides): Promise<UpdateRolePolicyRuleResponse>;
}

export function createSecurityApi(client: CmsSdkClientCore): SecurityApi {
  return {
    approvePluginGrant: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/security/plugin-grants/:id/approve",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    assignUserRole: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/users/:id/roles",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    denyPluginGrant: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/security/plugin-grants/:id/deny",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    getPluginGrant: async (input, options) =>
      client.request({
        method: "GET",
        path: "/v1/security/plugin-grants/:id",
        pathParams: input.path,
        query: undefined,
        body: undefined,
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listPluginGrants: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/security/plugin-grants",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    listSecurityAudit: async (input = {}, options) =>
      client.request({
        method: "GET",
        path: "/v1/security/audit",
        pathParams: undefined,
        query: input.query,
        body: undefined,
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      }),
    revokePluginGrant: async (input, options) =>
      client.request({
        method: "POST",
        path: "/v1/security/plugin-grants/:id/revoke",
        pathParams: input.path,
        query: undefined,
        body: input.body,
        bodyType: "json",
        responseType: "json",
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
        bodyType: "json",
        responseType: "json",
        headers: options?.headers,
        credentials: options?.credentials,
        signal: options?.signal,
      })
  };
}
