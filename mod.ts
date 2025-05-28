import { type Cause, type Context, Data, Effect, Layer, Option, pipe, Record, Stream } from "@effect";
import type { 
    DescService, 
    DescMethodUnary, 
    MessageInitShape, 
    MessageShape, 
    DescMethodServerStreaming, 
    DescMessage,
} from "@bufbuild/protobuf"
import { 
    createClient, 
    type Transport, 
    type Client, 
    type CallOptions, 
    createRouterTransport, 
    type ConnectRouterOptions, 
    type ConnectRouter
} from "@connectrpc/connect";
import { 
    createConnectTransport, 
    createGrpcTransport, 
    type GrpcTransportOptions, 
    type ConnectTransportOptions 
} from "@connectrpc/connect-node";
import { UserAuthenticatorService, UserManagementService } from "@tardis/authenticator/user_service_pb.ts";
import * as UserMessages from "@tardis/authenticator/user_messages_pb.ts"
import { ParkingManagementService, SubscriptionManagementService } from "@tardis/management/management_service_pb.ts";
import * as ParkingManagementMessages from "@tardis/management/management_messages_pb.ts";
import { ParkingService } from "@tardis/parking/parking_service_pb.ts"
import type * as ParkingMessages from "@tardis/parking/parking_messages_pb.ts";
import { Health, type HealthCheckResponse } from "@tardis/health/health_pb.ts";
import type { CommonTransportOptions } from "@connectrpc/connect/protocol";
import { type ClientError, refineError } from "./errors.ts";
import type { NoSuchElementException } from "@effect/Cause";
export * as Common from "@tardis/common/common_messages_pb.ts";
export { ParkingManagementMessages };

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
    static router = (routes: (router: ConnectRouter) => void, options?: {
        transport?: Partial<CommonTransportOptions>;
        router?: ConnectRouterOptions;
    }): Transport => {
        return createRouterTransport(routes, options)
    }

    static routerLayer = (routes: (router: ConnectRouter) => void, options?: {
        transport?: Partial<CommonTransportOptions>;
        router?: ConnectRouterOptions;
    }): Layer.Layer<TransportLayer> => {
        return Layer.effect(TransportLayer, Effect.sync(() => {
            return { tx: createRouterTransport(routes, options) }
        }))
    }

    static routerEffect = (routes: (router: ConnectRouter) => void, options?: {
        transport?: Partial<CommonTransportOptions>;
        router?: ConnectRouterOptions;
    }): Effect.Effect<Transport> => {
        return Effect.suspend(() => {
            return Effect
                .succeed(createRouterTransport(routes, options))
        })
    }

    static connect = (options: ConnectTransportOptions): Transport => {
        return createConnectTransport(options)
    }

    static connectLayer = (options: ConnectTransportOptions): Layer.Layer<TransportLayer> => {
        return Layer.effect(TransportLayer, Effect.sync(() => {
            return { tx: createConnectTransport(options) }
        }))
    }

    static connectEffect = (options: ConnectTransportOptions): Effect.Effect<Transport> => {
        return Effect.suspend(() => {
            return Effect
                .succeed(createConnectTransport(options))
        })
    }

    static grpc = (options: GrpcTransportOptions): Transport => {
        return createGrpcTransport(options)
    }

    static grpcLayer = (options: GrpcTransportOptions): Layer.Layer<TransportLayer> => {
        return Layer.effect(TransportLayer, Effect.sync(() => {
            return { tx: createGrpcTransport(options) }
        }))
    }

    static grpcEffect = (options: GrpcTransportOptions): Effect.Effect<Transport> => {
        return Effect.suspend(() => {
            return Effect
                .succeed(createGrpcTransport(options))
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
            ClientError
        > 
        :
        Desc["method"][P] extends DescMethodServerStreaming<infer I, infer O>
        ? (request: MessageInitShape<I>, options?: CallOptions) => Stream.Stream<
            MessageShape<O>,
            ClientError
        >
        : never
};

type UnaryFn<I extends DescMessage, O extends DescMessage> = (request: MessageInitShape<I>, options?: CallOptions) => Promise<MessageShape<O>>
const wrapUnary = <I extends DescMessage, O extends DescMessage>(fn: UnaryFn<I,O>) => {
    return (init: MessageInitShape<I>, options: CallOptions = {}) => {
        return Effect.tryPromise({
            try: (signal) => {
                return fn(init, { ...options, signal })
            },
            catch: (error) => refineError(error)
        })
    }
}

type ServerStreamFn<I extends DescMessage, O extends DescMessage> = (request: MessageInitShape<I>, options?: CallOptions) => AsyncIterable<MessageShape<O>>
const wrapServerStream = <I extends DescMessage, O extends DescMessage>(fn: ServerStreamFn<I,O>) => {
    return (init: MessageInitShape<I>, options: CallOptions = {}) => {
        return Stream.fromAsyncIterable(
            fn(init, options),
            (error) => refineError(error)
        )
    }
}

const isKeyOf = <T extends {}>(obj: T, key: PropertyKey): key is keyof T => {
    return Object.hasOwn(obj, key)
}

export const wrapClient = <T extends DescService>(desc: T, client: Client<T>): ClientProxy<T> => {
    return new Proxy(client, {
        get(target: Client<T>, p){
            if( isKeyOf(target, p) ){
                const def = desc.method[p];
                switch(def.methodKind){
                    case "unary":
                        // deno-lint-ignore no-explicit-any
                        return wrapUnary(target[p] as UnaryFn<any, any>)
                    case "server_streaming":
                        // deno-lint-ignore no-explicit-any
                        return wrapServerStream(target[p] as ServerStreamFn<any,any>)
                    default:
                        return undefined;
                }
            }
            return undefined;
        }
    }) as unknown as ClientProxy<T>;
}

type ProxyEffect<T extends DescService, R = TransportLayer> = Effect.Effect<ClientProxy<T>, never, R>;

const makeProxy = <
    R,
    const T extends DescService,
>(def: T, service: Effect.Effect<Client<T>, never, R>): ProxyEffect<T, R> => {
    return service.pipe(Effect.map(client => wrapClient(def, client)))
}

type ProxyLayer<T, R = TransportLayer> = Layer.Layer<T, never, R>;

type StubBuilder<T extends DescService> = 
    (partial: Partial<ClientProxy<T>>) => 
        Effect.Effect<ClientProxy<T>>

const makeClientStubBuilder = <
    T extends DescService
>(service: T) => (partial: Partial<ClientProxy<T>> = {}) : Effect.Effect<ClientProxy<T>> => {
    return Effect.sync(function(){
        const stub = Object.fromEntries(
            service.methods.map(m => m.localName)
            .map((op) => [op, () => {
                throw new Error(`Unimplemented Operation ${op}`)
            }])) as unknown as ClientProxy<T>;
        return {
            ...stub,
            ...partial
        }
    })
}

type PartialMockBuilder<T extends DescService> = 
    (partial: Partial<ClientProxy<T>>) => 
        Effect.Effect<ClientProxy<T>, never, TransportLayer>;

const makePartialMockBuilder = <
    T extends DescService
>(service: T) => (partial: Partial<ClientProxy<T>> = {}) : Effect.Effect<ClientProxy<T>, never, TransportLayer> => {
    return Effect.gen(function*(){
        const client = yield* makeProxy(service, makeClient(service));
        return {
            ...client,
            ...partial
        }
    })
}

type CatchAllImpl = (operation: string, payload: unknown) => Effect.Effect<unknown>
type PartialBuilder<T extends DescService> = 
    <Arg extends Partial<ClientProxy<T>> | CatchAllImpl>(partial: Arg) => 
        Effect.Effect<ClientProxy<T>, never, 
        // deno-lint-ignore no-explicit-any
        Arg extends ((...args: any[]) => any) 
        ? never
        : TransportLayer>;

const makePartialBuilder = <
    T extends DescService
>(service: T) => 
    <Arg extends Partial<ClientProxy<T>> | CatchAllImpl>(partial: Arg) : 
        // deno-lint-ignore no-explicit-any
        Effect.Effect<ClientProxy<T>, never, Arg extends ((...args: any[]) => any) 
        ? never
        : TransportLayer
    > => {
    return Effect.gen(function*(){
        if( partial instanceof Function ){
            const entries = service.methods.map(m => m.localName)
                .map(
                    key => [key, (payload: unknown) => partial(key, payload)] as const
                );
            const res = Object.fromEntries(entries) as unknown as ClientProxy<T>;
            return res
        }

        const client = yield* makeProxy(service, makeClient(service));
        return {
            ...client,
            ...partial
        }
    // deno-lint-ignore no-explicit-any
    }) as Effect.Effect<ClientProxy<T>, never, Arg extends ((...args: any[]) => any) 
        ? never
        : TransportLayer
    >
}

type DefaultLayer<T, R = TardisTransports> = Layer.Layer<T, NoSuchElementException, R>;

const makeDefault = <
    T extends DescService,
    Self extends {
        ServiceDefinition: T,
        Name: ServiceName
    }
>(
    tag: Self
): Layer.Layer<Self extends Context.Tag<infer Id, infer _> ? Id : never, NoSuchElementException, TardisTransports> => {
    const build = Effect.gen(function*(){
        const transport = yield* TardisTransports.ask(tag.Name);
        const client = createClient(tag.ServiceDefinition, transport);
        return wrapClient(tag.ServiceDefinition, client) as Self extends Context.Tag<
            infer _, 
            infer Value
        > ? Value : never;
    })
    return Layer.effect(tag as unknown as Context.Tag<
        Self extends Context.Tag<infer Id, infer _> ? Id : never, 
        Self extends Context.Tag<infer _, infer Value> ? Value : never
    >, build);
}

type Ask<Name extends ServiceName> = () => Effect.Effect<
    Option.Option.Value<TardisClients.Shape[Name]>,
    never, 
    TardisClients
>
const makeAsk = <Name extends ServiceName>(self: { readonly Name: Name }) => {
    return () => TardisClients.ask(self.Name)
}

export declare namespace UserAuthenticator {
    type AuthStatus = UserMessages.AuthStatus

    namespace Messages {
        type LoginRequest = UserMessages.LoginRequest;
        type LoginResponse = UserMessages.LoginResponse;
        type LogoutRequest = UserMessages.LogoutRequest;
        type LogoutResponse = UserMessages.LogoutResponse;
        type ValidateAuthRequest = UserMessages.ValidateAuthRequest;
        type ValidateAuthResponse = UserMessages.ValidateAuthResponse;
    }
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
    static get ServiceDefinition(): typeof UserAuthenticatorService {
        return UserAuthenticatorService
    }
    static Raw = (tx: Transport): Client<typeof UserAuthenticatorService> => 
        createClient(this.ServiceDefinition, tx);
    static Partial: PartialBuilder<typeof UserAuthenticatorService> =
        makePartialBuilder(UserAuthenticatorService)
    static Mock: PartialMockBuilder<typeof UserAuthenticatorService> = 
        makePartialMockBuilder(UserAuthenticatorService)
    static Stub: StubBuilder<typeof UserAuthenticatorService> = 
        makeClientStubBuilder(UserAuthenticatorService)
    static Effect: ClientEffect<typeof UserAuthenticatorService> = 
        makeClient(UserAuthenticatorService);
    static Layer: ProxyLayer<UserAuthenticator> = 
        Layer.effect(this, makeProxy(this.ServiceDefinition, this.Effect));
    static Default: DefaultLayer<UserAuthenticator> = makeDefault(this);
    static ask: Ask<typeof this.Name> = makeAsk(this);
    static Name = "UserAuthenticator" as const
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
    static get ServiceDefinition(): typeof UserManagementService {
        return UserManagementService
    }
    static Raw = (tx: Transport): Client<typeof UserManagementService> => 
        createClient(this.ServiceDefinition, tx);
    static Partial: PartialBuilder<typeof UserManagementService> = 
        makePartialBuilder(UserManagementService)
    static Mock: PartialMockBuilder<typeof UserManagementService> = 
        makePartialMockBuilder(UserManagementService)
    static Stub: StubBuilder<typeof UserManagementService> = 
        makeClientStubBuilder(UserManagementService)
    static Effect: ClientEffect<typeof UserManagementService> = 
        makeClient(UserManagementService);
    static Layer: ProxyLayer<UserManagement> = 
        Layer.effect(this, makeProxy(this.ServiceDefinition, this.Effect));
    static Default: DefaultLayer<UserManagement> = makeDefault(this);
    static ask: Ask<typeof this.Name> = makeAsk(this);
    static Name = "UserManagement" as const
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

export class ParkingManagement extends ParkingManagementSuper {
    static SubscriptionStatus = ParkingManagementMessages.SubscriptionStatus;
    static get ServiceDefinition(): typeof ParkingManagementService {
        return ParkingManagementService
    }
    static Raw = (tx: Transport): Client<typeof ParkingManagementService> => 
        createClient(this.ServiceDefinition, tx);
    static Partial: PartialBuilder<typeof ParkingManagementService> = 
        makePartialBuilder(ParkingManagementService)
    static Mock: PartialMockBuilder<typeof ParkingManagementService> = 
        makePartialMockBuilder(ParkingManagementService)
    static Stub: StubBuilder<typeof ParkingManagementService> = 
        makeClientStubBuilder(ParkingManagementService)
    static Effect: ClientEffect<typeof ParkingManagementService> = 
        makeClient(ParkingManagementService);
    static Layer: ProxyLayer<ParkingManagement> = 
        Layer.effect(this, makeProxy(this.ServiceDefinition, this.Effect));
    static Default: DefaultLayer<ParkingManagement> = makeDefault(this);
    static ask: Ask<typeof this.Name> = makeAsk(this);
    static Name = "ParkingManagement" as const
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
    type GetSubscriptionByPlateRequest = ParkingManagementMessages.GetSubscriptionByPlateRequest;
    type GetSubscriptionByPlateResponse = ParkingManagementMessages.GetSubscriptionByPlateResponse;
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
    static SubscriptionStatus = ParkingManagementMessages.SubscriptionStatus;
    static get ServiceDefinition(): typeof SubscriptionManagementService {
        return SubscriptionManagementService
    }
    static Raw = (tx: Transport): Client<typeof SubscriptionManagementService> => 
        createClient(this.ServiceDefinition, tx);
    static Partial: PartialBuilder<typeof SubscriptionManagementService> = 
        makePartialBuilder(SubscriptionManagementService)
    static Mock: PartialMockBuilder<typeof SubscriptionManagementService> = 
        makePartialMockBuilder(SubscriptionManagementService)
    static Stub: StubBuilder<typeof SubscriptionManagementService> = 
        makeClientStubBuilder(SubscriptionManagementService)
    static Effect: ClientEffect<typeof SubscriptionManagementService> = 
        makeClient(SubscriptionManagementService);
    static Layer: ProxyLayer<SubscriptionManagement> = 
        Layer.effect(this, makeProxy(this.ServiceDefinition, this.Effect));
    static Default: DefaultLayer<SubscriptionManagement> = makeDefault(this)
    static ask: Ask<typeof this.Name> = makeAsk(this);
    static Name = "SubscriptionManagement" as const
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
    static get ServiceDefinition(): typeof ParkingService {
        return ParkingService
    }
    static Raw = (tx: Transport): Client<typeof ParkingService> => 
        createClient(this.ServiceDefinition, tx);
    static Partial: PartialBuilder<typeof ParkingService> = 
        makePartialBuilder(ParkingService)
    static Mock: PartialMockBuilder<typeof ParkingService> = 
        makePartialMockBuilder(ParkingService)
    static Stub: StubBuilder<typeof ParkingService> = 
        makeClientStubBuilder(ParkingService)
    static Effect: ClientEffect<typeof ParkingService> = 
        makeClient(ParkingService);
    static Layer: ProxyLayer<Parking> = 
        Layer.effect(this, makeProxy(this.ServiceDefinition, this.Effect));
    static Default: DefaultLayer<Parking> = makeDefault(this);
    static ask: Ask<typeof this.Name> = makeAsk(this);
    static Name = "Parking" as const
    static Id = "wogo.tardis.parking.v1.ParkingService" as const;
}


export const ServiceNames = [
    "Parking",
    "ParkingManagement",
    "SubscriptionManagement",
    "UserAuthenticator",
    "UserManagement",
] as const

export type ServiceName = typeof ServiceNames[number];

export const ServiceIds = {
    Parking: Parking.Id,
    ParkingManagement: ParkingManagement.Id,
    SubscriptionManagement: SubscriptionManagement.Id,
    UserAuthenticator: UserAuthenticator.Id,
    UserManagement: UserManagement.Id,
} as const

export type ServiceId = typeof ServiceIds[keyof typeof ServiceIds];

export declare namespace HealthCheck {
    type Shape = {
        check: (service: ServiceId) => Effect.Effect<HealthCheckResponse, ClientError>;
        watch: (service: ServiceId) => Stream.Stream<HealthCheckResponse, ClientError>;
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
    static Raw = (tx: Transport): Client<typeof Health> => 
        createClient(Health, tx);
    static RawClient: ClientEffect<typeof Health> =
        makeClient(Health);
    static Effect: Effect.Effect<HealthCheck.Shape, never, TransportLayer> = 
        Effect.gen(function*(){
            const client = yield* makeClient(Health);
            return HealthCheck.of({
                check: (service) => Effect.tryPromise({
                    try: (signal) => client.check({ service }, { signal }),
                    catch: (error) => refineError(error) 
                }),
                watch: (service) => {
                    return Stream.fromAsyncIterable(
                        client.watch({ service }),
                        error => refineError(error)
                    )
                }
            })
        })
    static Layer: Layer.Layer<HealthCheck, never, TransportLayer> = Layer.effect(this, this.Effect);
}

export declare namespace TardisTransports {
    type GrpcTransport = ({
        kind: "grpc"
    } & GrpcTransportOptions)

    type ConnectTransport = ({
        kind: "connect"
    } & ConnectTransportOptions)

    type RouterTransport = ({
        kind: "router"
    } & { 
        routes: (router: ConnectRouter) => void, 
        options?: {
            transport?: Partial<CommonTransportOptions>;
            router?: ConnectRouterOptions;
        }
    })

    type EmptyTransport = {
        kind: "empty"
    }

    type TransportOptions = GrpcTransport | ConnectTransport | RouterTransport | EmptyTransport;

    type TransportConfig = {
        Parking: TransportOptions,
        ParkingManagement: TransportOptions,
        SubscriptionManagement: TransportOptions,
        UserAuthenticator: TransportOptions,
        UserManagement: TransportOptions,
    }

    type Shape = {
        Parking: Option.Option<Transport>,
        ParkingManagement: Option.Option<Transport>,
        SubscriptionManagement: Option.Option<Transport>,
        UserAuthenticator: Option.Option<Transport>,
        UserManagement: Option.Option<Transport>,
    }
}

const TardisTransportsSuper: EffectTagType<
    TardisTransports,
    "@clients/TardisTransports",
    TardisTransports.Shape
> = Effect.Tag("@clients/TardisTransports")<
    TardisTransports,
    TardisTransports.Shape
>();

type TardisTransportAsk = <Name extends ServiceName>(name: Name) => Effect.Effect<Transport, NoSuchElementException, TardisTransports>
export class TardisTransports extends TardisTransportsSuper {
    static ask: TardisTransportAsk = Effect.fnUntraced(function*<Name extends ServiceName>(name: Name){
        const transports = yield* TardisTransports;
        const tx = yield* transports[name]
        return tx
    })

    static Layer = (hosts: TardisTransports.TransportConfig): Layer.Layer<TardisTransports> => {
        const makeTransport = (options: TardisTransports.TransportOptions) => {
            switch(options.kind){
                case "connect": 
                    return Option.some(createConnectTransport(options));
                case "grpc": 
                    return Option.some(createGrpcTransport(options));
                case "router":
                    return Option.some(createRouterTransport(options.routes, options.options));
                case "empty":
                    return Option.none();
            }
        }

        const transports = pipe(
            hosts,
            Record.map(host => makeTransport(host))
        )

        return Layer.succeed(this, transports);
    }

    static Partial = (hosts: Partial<TardisTransports.TransportConfig>): Layer.Layer<TardisTransports> => {
        return this.Layer({
            Parking: { kind: "empty" },
            ParkingManagement: { kind: "empty" },
            SubscriptionManagement: { kind: "empty" },
            UserAuthenticator: { kind: "empty" },
            UserManagement: { kind: "empty" },
            ...hosts,
        })
    }
}

export class MissingClient extends Data.Error<{ name: string }> {
    static fromNoSuchElement = (name: string) => (): MissingClient => {
        return new MissingClient({ name });
    }
}

export declare namespace Heartbeat {
    type Shape = {
        checkParking: (options?: CallOptions) => Effect.Effect<HealthCheckResponse, ClientError | MissingClient>;
        checkParkingManagement: (options?: CallOptions) => Effect.Effect<HealthCheckResponse, ClientError | MissingClient>;
        checkSubscriptionManagement: (options?: CallOptions) => Effect.Effect<HealthCheckResponse, ClientError | MissingClient>;
        checkUserAuthenticator: (options?: CallOptions) => Effect.Effect<HealthCheckResponse, ClientError | MissingClient>;
        checkUserManagement: (options?: CallOptions) => Effect.Effect<HealthCheckResponse, ClientError | MissingClient>;
        watchParking: (options?: CallOptions) => Effect.Effect<Stream.Stream<HealthCheckResponse, ClientError>, MissingClient>;
        watchParkingManagement: (options?: CallOptions) => Effect.Effect<Stream.Stream<HealthCheckResponse, ClientError>, MissingClient>;
        watchSubscriptionManagement: (options?: CallOptions) => Effect.Effect<Stream.Stream<HealthCheckResponse, ClientError>, MissingClient>;
        watchUserAuthenticator: (options?: CallOptions) => Effect.Effect<Stream.Stream<HealthCheckResponse, ClientError>, MissingClient>;
        watchUserManagement: (options?: CallOptions) => Effect.Effect<Stream.Stream<HealthCheckResponse, ClientError>, MissingClient>;
    }
}

const HeartbeatSuper: EffectTagType<
    Heartbeat,
    "@clients/Heartbeat",
    Heartbeat.Shape
> = Effect.Tag("@clients/Heartbeat")<
    Heartbeat,
    Heartbeat.Shape
>();

export class Heartbeat extends HeartbeatSuper {
    static Layer: Layer.Layer<
        Heartbeat, 
        never, 
        TardisTransports
    > = Layer.effect(this, Effect.gen(function*(){
        const transports = yield* TardisTransports;

        const clients = pipe(
            transports,
            Record.map(tx => {
                return pipe(
                    tx,
                    Option.map(tx => {
                        return createClient(Health, tx)
                    })
                )
            })
        )

        return ServiceNames.reduce((acc, next) => {
            const service = ServiceIds[next];
            const checkKey = `check${next}` as const
            const watchKey = `watch${next}` as const
            return {
                ...acc,
                [checkKey]: Effect.fn(`Healthcheck on ${next}`)(
                    function*(options?: CallOptions){
                        const client = yield* clients[next];
                        return yield* Effect.tryPromise({
                            try: (signal) => client.check(
                                { service }, 
                                { ...options, signal }
                            ),
                            catch: error => refineError(error)
                        })
                    },
                    Effect.catchTag("NoSuchElementException", MissingClient.fromNoSuchElement(next))
                ),
                [watchKey]: Effect.fn(`Building Watch on ${next}`)(function*(options?: CallOptions){
                        const client = yield* clients[next];
                        return Stream.fromAsyncIterable(
                            client.watch({ service }, { ...options }),
                            error => refineError(error)
                        )
                    },
                    Effect.catchTag("NoSuchElementException", MissingClient.fromNoSuchElement(next))
                ),
            }
        }, {} as Heartbeat.Shape)
    }))
}

export declare namespace TardisClients {
    type Shape = {
        Parking: Option.Option<ClientProxy<typeof Parking.ServiceDefinition>>,
        ParkingManagement: Option.Option<ClientProxy<typeof ParkingManagement.ServiceDefinition>>,
        SubscriptionManagement: Option.Option<ClientProxy<typeof SubscriptionManagement.ServiceDefinition>>,
        UserAuthenticator: Option.Option<ClientProxy<typeof UserAuthenticator.ServiceDefinition>>,
        UserManagement: Option.Option<ClientProxy<typeof UserManagement.ServiceDefinition>>,
    }
}

const TardisClientsSuper: EffectTagType<
    TardisClients,
    "@clients/TardisClients",
    TardisClients.Shape
> = Effect.Tag("@clients/TardisClients")<
    TardisClients,
    TardisClients.Shape
>();

type TardisClientAsk = <Name extends ServiceName>(name: Name) => Effect.Effect<
    Option.Option.Value<TardisClients.Shape[Name]>, 
    never, 
    TardisClients
>
export class TardisClients extends TardisClientsSuper {
    static ask: TardisClientAsk = Effect.fnUntraced(function*<Name extends ServiceName>(name: Name){
        const clients = yield* TardisClients;
        const maybeClient = yield* clients[name];
        return maybeClient as Option.Option.Value<TardisClients.Shape[Name]>
    },
        (_, name) => Effect.orDieWith(_, () => new Error(`Missing transport for ${name}`))
    )

    static Layer: Layer.Layer<
        TardisClients, 
        never, 
        TardisTransports
    > = Layer.effect(this, Effect.gen(function*(){
        const transports = yield* TardisTransports;

        const services = {
            Parking: Parking.ServiceDefinition,
            ParkingManagement: ParkingManagement.ServiceDefinition,
            SubscriptionManagement: SubscriptionManagement.ServiceDefinition,
            UserAuthenticator: UserAuthenticator.ServiceDefinition,
            UserManagement: UserManagement.ServiceDefinition,
        } as const;

        const clients = pipe(
            services,
            Record.map((service, name) => {
                return pipe(
                    transports[name],
                    Option.map(tx => {
                        return wrapClient(service, createClient(service, tx))
                    })
                )
            })
        ) as { [P in ServiceName]: Option.Option<ClientProxy<typeof services[P]>> }

        return clients
    }))
}