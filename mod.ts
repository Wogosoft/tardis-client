import { type Cause, type Context, Effect, Layer } from "@effect";
import type { DescService, DescMethodUnary, MessageInitShape, MessageShape } from "@bufbuild/protobuf"
import { createClient, type Transport, type Client, type CallOptions } from "@connectrpc/connect";
import { createConnectTransport, type ConnectTransportOptions } from "@connectrpc/connect-node";
import { UserAuthenticatorService, UserManagementService } from "@tardis/authenticator/user_service_pb.ts";
import * as UserMessages from "@tardis/authenticator/user_messages_pb.ts"
import { ParkingManagementService, SubscriptionManagementService } from "@tardis/management/management_service_pb.ts";
import type * as ParkingManagementMessages from "@tardis/management/management_messages_pb.ts";
import { ParkingService } from "@tardis/parking/parking_service_pb.ts"
import type * as ParkingMessages from "@tardis/parking/parking_messages_pb.ts";
import { Health, type HealthCheckResponse } from "@tardis/health/health_pb.ts";
export * as Common from "@tardis/common/common_messages_pb.ts";

export declare namespace TransportLayer {
    type Shape = {
        tx: Transport
    }
}

type EffectTagType<Self, Id extends string, Type> = Context.TagClass<
    Self, 
    Id, 
    Type
> & Effect.Tag.Proxy<Self, Type> & {
use: <X>(body: (_: Type) => X) => 
    [X] extends [Effect.Effect<infer A, infer E, infer R>] ? Effect.Effect<A, E, R | Self> : 
    [X] extends [PromiseLike<infer A>] ? Effect.Effect<A, Cause.UnknownException, Self> : 
    Effect.Effect<X, never, Self>;
} 

const TransportLayerSuper: EffectTagType<
    TransportLayer, "TransportLayer", TransportLayer.Shape
> = Effect.Tag("TransportLayer")<
    TransportLayer,
    TransportLayer.Shape
>();

export class TransportLayer extends TransportLayerSuper {
    static makeConnectTransport = (options: ConnectTransportOptions): Layer.Layer<TransportLayer> => {
        return Layer.effect(TransportLayer, Effect.sync(() => {
            return { tx: createConnectTransport(options) }
        }))
    }

    static makeTransport = (options: ConnectTransportOptions): Effect.Effect<Transport> => {
        return Effect.suspend(() => {
            return Effect
                .succeed(createConnectTransport(options))
        })
    }
}

type ClientEffect<T extends DescService, R = TransportLayer> = Effect.Effect<
    Client<T>, never, R
>

const makeClient = <T extends DescService>(service: T): ClientEffect<T> => {
    return Effect.gen(function*(){
        const tx = yield* TransportLayer.tx;
        return createClient(service, tx) 
    })
}

type ClientProxy<Desc extends DescService> = {
    [P in keyof Desc["method"]]: 
        Desc["method"][P] extends DescMethodUnary<infer I, infer O> 
        ? (request: MessageInitShape<I>, options?: CallOptions) => Effect.Effect<
            MessageShape<O>,
            Cause.UnknownException
        > 
        : never;
};

export const wrapClient = <T extends DescService>(client: Client<T>): ClientProxy<T> => {
    return new Proxy(client, {
        get(target, p){
            if( target[p as keyof Client<T>] !== undefined ){
                // deno-lint-ignore no-explicit-any
                type UnaryFn = (request: MessageInitShape<any>, options?: CallOptions) => Promise<MessageShape<any>>
                // deno-lint-ignore no-explicit-any
                return (init: MessageInitShape<any>, opts: CallOptions = {}) => Effect.tryPromise((signal) => {
                    return (target[p as keyof Client<T>] as UnaryFn)(init, { 
                        signal,
                        ...opts
                    });
                })
            }
            return undefined;
        }
    }) as unknown as ClientProxy<T>;
}

type ProxyEffect<T extends DescService, R = TransportLayer> = Effect.Effect<ClientProxy<T>, never, R>;

const makeProxy = <
    R,
    const T extends DescService,
>(service: Effect.Effect<Client<T>, never, R>): ProxyEffect<T, R> => {
    return service.pipe(Effect.map(wrapClient))
}

type ProxyLayer<T, R = TransportLayer> = Layer.Layer<T, never, R>;

export declare namespace UserAuthenticator {
    type AuthStatus = UserMessages.AuthStatus
}

export declare namespace UserAuthenticator.Messages {
    type LoginRequest = UserMessages.LoginRequest;
    type LoginResponse = UserMessages.LoginResponse;
    type LogoutRequest = UserMessages.LogoutRequest;
    type LogoutResponse = UserMessages.LogoutResponse;
    type ValidateAuthRequest = UserMessages.ValidateAuthRequest;
    type ValidateAuthResponse = UserMessages.ValidateAuthResponse;
}


const UserAuthenticatorSuper : EffectTagType<
    UserAuthenticator,
    "@clients/UserAuthenticator",
    ClientProxy<typeof UserAuthenticatorService>
> = Effect.Tag("@clients/UserAuthenticator")<
    UserAuthenticator,
    ClientProxy<typeof UserAuthenticatorService>
>()

export class UserAuthenticator extends UserAuthenticatorSuper {
    static AuthStatus = UserMessages.AuthStatus;
    static Effect: ClientEffect<typeof UserAuthenticatorService> = 
        makeClient(UserAuthenticatorService);
    static Layer: ProxyLayer<UserAuthenticator> = 
        Layer.effect(this, makeProxy(this.Effect));
    static Id = "wogo.tardis.authenticator.v1.UserAuthenticatorService" as const;
}

export declare namespace UserManagement.Messages {
    type CreateNewUserRequest = UserMessages.CreateNewUserRequest;
    type CreateNewUserResponse = UserMessages.CreateNewUserResponse;
    type ChangePasswordRequest = UserMessages.ChangePasswordRequest;
    type ChangePasswordResponse = UserMessages.ChangePasswordResponse;
}

const UserManagementSuper: EffectTagType<
    UserManagement,
    "@clients/UserManagement",
    ClientProxy<typeof UserManagementService>
> = Effect.Tag("@clients/UserManagement")<
    UserManagement,
    ClientProxy<typeof UserManagementService>
>();

export class UserManagement extends UserManagementSuper {
    static Effect: ClientEffect<typeof UserManagementService> = 
        makeClient(UserManagementService);
    static Layer: ProxyLayer<UserManagement> = 
        Layer.effect(this, makeProxy(this.Effect));
    static Id = "wogo.tardis.authenticator.v1.UserManagementService" as const
}

export declare namespace ParkingManagement.Messages {
    type AddNewParkingRequest = ParkingManagementMessages.AddNewParkingRequest;
    type AddNewParkingResponse = ParkingManagementMessages.AddNewParkingResponse;
    type UpdateParkingMetadataRequest = ParkingManagementMessages.UpdateParkingMetadataRequest;
    type UpdateParkingMetadataResponse = ParkingManagementMessages.UpdateParkingMetadataResponse;
    type UpdateBaseParkingBillingMethodRequest = ParkingManagementMessages.UpdateBaseParkingBillingMethodRequest;
    type UpdateBaseParkingBillingMethodResponse = ParkingManagementMessages.UpdateBaseParkingBillingMethodResponse;
    type ListVehiclesInParkingRequest = ParkingManagementMessages.ListVehiclesInParkingRequest;
    type ListVehiclesInParkingResponse = ParkingManagementMessages.ListVehiclesInParkingResponse;
    type ListReservationHistoryRequest = ParkingManagementMessages.ListReservationHistoryRequest;
    type ListReservationHistoryResponse = ParkingManagementMessages.ListReservationHistoryResponse;
}

const ParkingManagementSuper : EffectTagType<
    ParkingManagement,
    "@clients/ParkingManagement",
    ClientProxy<typeof ParkingManagementService>
> = Effect.Tag("@clients/ParkingManagement")<
    ParkingManagement,
    ClientProxy<typeof ParkingManagementService>
>();

export class ParkingManagement extends ParkingManagementSuper{
    static Effect: ClientEffect<typeof ParkingManagementService> = 
        makeClient(ParkingManagementService);
    static Layer: ProxyLayer<ParkingManagement> = 
        Layer.effect(this, makeProxy(this.Effect));
    static Id = "wogo.tardis.management.v1.ParkingManagementService" as const
}

export declare namespace SubscriptionManagement.Messages {
    type AddSubscriptionParametersRequest = ParkingManagementMessages.AddSubscriptionParametersRequest;
    type AddSubscriptionParametersResponse = ParkingManagementMessages.AddSubscriptionParametersResponse;
    type UpdateSubscriptionParametersRequest = ParkingManagementMessages.UpdateSubscriptionParametersRequest;
    type UpdateSubscriptionParametersResponse = ParkingManagementMessages.UpdateSubscriptionParametersResponse;
    type ListSubscriptionMetadataRequest = ParkingManagementMessages.ListSubscriptionMetadataRequest;
    type ListSubscriptionMetadataResponse = ParkingManagementMessages.ListSubscriptionMetadataResponse;
    type CreateCustomerSubscriptionRequest = ParkingManagementMessages.CreateCustomerSubscriptionRequest;
    type CreateCustomerSubscriptionResponse = ParkingManagementMessages.CreateCustomerSubscriptionResponse;
    type GetCustomerSubscriptionRequest = ParkingManagementMessages.GetCustomerSubscriptionRequest;
    type GetCustomerSubscriptionResponse = ParkingManagementMessages.GetCustomerSubscriptionResponse;
    type ListCustomerSubscriptionsRequest = ParkingManagementMessages.ListCustomerSubscriptionsRequest;
    type ListCustomerSubscriptionsResponse = ParkingManagementMessages.ListCustomerSubscriptionsResponse;
    type CancelCustomerSubscriptionRequest = ParkingManagementMessages.CancelCustomerSubscriptionRequest;
    type CancelCustomerSubscriptionResponse = ParkingManagementMessages.CancelCustomerSubscriptionResponse;
    type RenewCustomerSubscriptionRequest = ParkingManagementMessages.RenewCustomerSubscriptionRequest;
    type RenewCustomerSubscriptionResponse = ParkingManagementMessages.RenewCustomerSubscriptionResponse;
    type UpdateCustomerSubscriptionRequest = ParkingManagementMessages.UpdateCustomerSubscriptionRequest;
    type UpdateCustomerSubscriptionResponse = ParkingManagementMessages.UpdateCustomerSubscriptionResponse;
};

const SubscriptionManagementSuper : EffectTagType<
    SubscriptionManagement,
    "@clients/SubscriptionManagement",
    ClientProxy<typeof SubscriptionManagementService>
> = Effect.Tag("@clients/SubscriptionManagement")<
    SubscriptionManagement,
    ClientProxy<typeof SubscriptionManagementService>
>();

export class SubscriptionManagement extends SubscriptionManagementSuper {
    static Effect: ClientEffect<typeof SubscriptionManagementService> = 
        makeClient(SubscriptionManagementService);
    static Layer: ProxyLayer<SubscriptionManagement> = 
        Layer.effect(this, makeProxy(this.Effect));
    static Id = "wogo.tardis.management.v1.SubscriptionManagementService" as const;
}

export declare namespace Parking.Messages {
    type CheckInRequest = ParkingMessages.CheckInRequest;
    type CheckInResponse = ParkingMessages.CheckInResponse;
    type BillingRequest = ParkingMessages.BillingRequest;
    type BillingResponse = ParkingMessages.BillingResponse;
    type PaymentConfirmationRequest = ParkingMessages.PaymentConfirmationRequest;
    type PaymentConfirmationResponse = ParkingMessages.PaymentConfirmationResponse;
    type CheckoutRequest = ParkingMessages.CheckoutRequest;
    type CheckoutResponse = ParkingMessages.CheckoutResponse;
}

const ParkingSuper: EffectTagType<
    Parking,
    "@clients/Parking",
    ClientProxy<typeof ParkingService>
> = Effect.Tag("@clients/Parking")<
    Parking,
    ClientProxy<typeof ParkingService>
>();

export class Parking extends ParkingSuper {
    static Effect: ClientEffect<typeof ParkingService> = 
        makeClient(ParkingService);
    static Layer: ProxyLayer<Parking> = 
        Layer.effect(this, makeProxy(this.Effect));
    static Id = "wogo.tardis.parking.v1.ParkingService" as const;
}

export const ServiceIds = [
    Parking.Id,
    ParkingManagement.Id,
    SubscriptionManagement.Id,
    UserAuthenticator.Id,
    UserManagement.Id,
] as const

export type ServiceId = typeof ServiceIds[number];

export declare namespace HealthCheck {
    type Shape = {
        check: (service: ServiceId) => Effect.Effect<HealthCheckResponse, Cause.UnknownException>;
    }
}

const HealthSuper: EffectTagType<
    HealthCheck,
    "@clients/health",
    HealthCheck.Shape
> = Effect.Tag("@clients/health")<
    HealthCheck,
    HealthCheck.Shape
>();

export class HealthCheck extends HealthSuper {
    static Effect: Effect.Effect<HealthCheck.Shape, never, TransportLayer> = 
        Effect.gen(function*(){
            const client = yield* makeClient(Health);
            return HealthCheck.of({
                check: (service) => Effect.tryPromise((signal) => client.check({ service }, { signal }))
            })
        })
    static Layer: Layer.Layer<HealthCheck, never, TransportLayer> = Layer.effect(this, this.Effect);
}