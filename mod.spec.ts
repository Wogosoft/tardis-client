import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { wrapClient } from "./mod.ts";
import type { CallOptions, Client } from "@connectrpc/connect";
import type { UserAuthenticatorService } from "@tardis/authenticator/user_service_pb.ts"
import type { LoginRequest, LoginResponse, LogoutRequest, LogoutResponse, AuthToken, ValidateAuthRequest, ValidateAuthResponse } from "./gen/wogo/tardis/authenticator/v1/user_messages_pb.ts";
import { Effect } from "@effect";

describe("Client proxy", () => {
    const TypeNames = {
        login: "wogo.tardis.authenticator.v1.LoginResponse",
        logout: "wogo.tardis.authenticator.v1.LogoutResponse",
        validateAuth: "wogo.tardis.authenticator.v1.ValidateAuthResponse",
    } as const

    const ClientStub = {
        login: function (_request: LoginRequest | { readonly $typeName?: undefined; username?: string | undefined; password?: string | undefined; }, _options?: CallOptions): Promise<LoginResponse> {
          return Promise.resolve({
              $typeName: TypeNames.login
          })
        },
        logout: function (_request: LogoutRequest | { readonly $typeName?: undefined; authToken?: (AuthToken | { readonly $typeName?: undefined; token?: string | undefined; }) | undefined; }, _options?: CallOptions): Promise<LogoutResponse> {
          return Promise.resolve({
              $typeName: TypeNames.logout
          })
        },
        validateAuth: function (_request: ValidateAuthRequest | { readonly $typeName?: undefined; authToken?: (AuthToken | { readonly $typeName?: undefined; token?: string | undefined; }) | undefined; }, _options?: CallOptions): Promise<ValidateAuthResponse> {
          return Promise.resolve({
              $typeName: TypeNames.validateAuth,
              status: 1
          })
        }
    } as const; 
    const MockClient: Client<typeof UserAuthenticatorService> = ClientStub;

    it("should forward to client and wrap in effect", async (t) => {
        const proxy = wrapClient(MockClient);
        const keys = Object.keys(ClientStub) as (keyof typeof ClientStub)[];

        for(const key of keys){
            await t.step({
                name: `Testing ${key}`,
                async fn(){
                    expect(proxy[key]).toBeDefined()
                    const res = await proxy[key]({}).pipe(
                        a => a as Effect.Effect<
                            ReturnType<typeof ClientStub[keyof typeof ClientStub]> extends Promise<infer A> ? A : never
                        >,
                        Effect.runPromise
                    );
                    expect(res.$typeName).toBe(TypeNames[key])
                }
            })
        }
    });
})