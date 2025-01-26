import { Context, Effect, Layer } from "@effect";
import type { DescService, DescMethodUnary, MessageInitShape, MessageShape } from "@bufbuild/protobuf"
import { createClient, type Transport, type Client, type CallOptions } from "@connectrpc/connect";
import { createConnectTransport, type ConnectTransportOptions } from "@connectrpc/connect-node";
import { UserAuthenticatorService, UserManagementService } from "@tardis/authenticator/user_service_pb.ts";
import type * as UserMessages from "@tardis/authenticator/user_messages_pb.ts"
import { ParkingManagementService, SubscriptionManagementService } from "@tardis/management/management_service_pb.ts";
import type * as ParkingManagementMessages from "@tardis/management/management_messages_pb.ts";
import { ParkingService } from "@tardis/parking/parking_service_pb.ts"
import type * as ParkingMessages from "@tardis/parking/parking_messages_pb.ts";

export declare namespace TransportLayer {
    type Shape = {
        tx: Transport
    }
}
export class TransportLayer
extends Effect.Tag("TransportLayer")<
    TransportLayer,
    TransportLayer.Shape
>(){
    static makeConnectTransport = (options: ConnectTransportOptions): Layer.Layer<TransportLayer> => {
        return Layer.effect(TransportLayer, Effect.sync(() => {
            return { tx: createConnectTransport(options) }
        }))
    }
}

const makeClient = <T extends DescService>(service: T): Effect.Effect<
    Client<T>,
    never,
    TransportLayer
> => {
    return Effect.gen(function*(){
        const tx = yield* TransportLayer.tx;
        return createClient(service, tx) 
    })
}

type ClientProxy<Desc extends DescService> = {
    [P in keyof Desc["method"]]: 
        Desc["method"][P] extends DescMethodUnary<infer I, infer O> 
        ? (request: MessageInitShape<I>, options?: CallOptions) => Effect.Effect<MessageShape<O>> 
        : never;
};

export const wrapClient = <T extends DescService>(client: Client<T>): ClientProxy<T> => {
    return new Proxy(client, {
        get(target, p){
            if( target[p as keyof Client<T>] !== undefined ){
                // deno-lint-ignore no-explicit-any
                type UnaryFn = (request: MessageInitShape<any>, options?: CallOptions) => Promise<MessageShape<any>>
                // deno-lint-ignore no-explicit-any
                return (init: MessageInitShape<any>, opts: CallOptions = {}) => Effect.promise((signal) => {
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

const makeProxy = <
    R,
    const T extends DescService,
>(service: Effect.Effect<Client<T>, never, R>) => {
    return service.pipe(Effect.map(wrapClient))
}

export declare namespace UserAuthenticator.Messages {
    type LoginRequest = UserMessages.LoginRequest;
    type LoginResponse = UserMessages.LoginResponse;
    type LogoutRequest = UserMessages.LogoutRequest;
    type LogoutResponse = UserMessages.LogoutResponse;
    type ValidateAuthRequest = UserMessages.ValidateAuthRequest;
    type ValidateAuthResponse = UserMessages.ValidateAuthResponse;
}

export class UserAuthenticator
extends Effect.Tag("@clients/UserAuthenticator")<
    UserAuthenticator,
    ClientProxy<typeof UserAuthenticatorService>
>(){
    static Effect = makeClient(UserAuthenticatorService);
    static Layer = Layer.effect(this, makeProxy(this.Effect));
}

export declare namespace UserManagement.Messages {
    type CreateNewUserRequest = UserMessages.CreateNewUserRequest;
    type CreateNewUserResponse = UserMessages.CreateNewUserResponse;
    type ChangePasswordRequest = UserMessages.ChangePasswordRequest;
    type ChangePasswordResponse = UserMessages.ChangePasswordResponse;
}

export class UserManagement
extends Effect.Tag("@clients/UserManagement")<
    UserManagement,
    ClientProxy<typeof UserManagementService>
>(){
    static Effect = makeClient(UserManagementService);
    static Layer = Layer.effect(this, makeProxy(this.Effect));
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

export class ParkingManagement
extends Effect.Tag("@clients/ParkingManagement")<
    ParkingManagement,
    ClientProxy<typeof ParkingManagementService>
>(){
    static Effect = makeClient(ParkingManagementService);
    static Layer = Layer.effect(this, makeProxy(this.Effect));
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
}

export class SubscriptionManagement
extends Context.Tag("@clients/SubscriptionManagement")<
    SubscriptionManagement,
    ClientProxy<typeof SubscriptionManagementService>
>(){
    static Effect = makeClient(SubscriptionManagementService);
    static Layer = Layer.effect(this, makeProxy(this.Effect));
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

export class Parking
extends Context.Tag("@clients/Parking")<
    Parking,
    ClientProxy<typeof ParkingService>
>(){
    static Effect = makeClient(ParkingService);
    static Layer = Layer.effect(this, makeProxy(this.Effect));
}