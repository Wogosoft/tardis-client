import { Data, Schema, Struct } from "@effect";

type RawError = {
    rawMessage: string,
    details: readonly unknown[],
    name: string,
}

type Input = RawError & {
    code: unknown
}

const omitCode = (input: Input) => Struct.omit("code")(input)

class GrpcError extends Data.Error<RawError>{}

class Cancelled extends GrpcError {
   readonly _tag: "Cancelled" = "Cancelled"
   readonly code: 1 = 1
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class Unknown extends GrpcError {
   readonly _tag: "Unknown" = "Unknown"
   readonly code: 2 = 2
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class InvalidArgument extends GrpcError {
   readonly _tag: "InvalidArgument" = "InvalidArgument"
   readonly code: 3 = 3
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class DeadlineExceeded extends GrpcError {
   readonly _tag: "DeadlineExceeded" = "DeadlineExceeded"
   readonly code: 4 = 4
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class NotFound extends GrpcError {
   readonly _tag: "NotFound" = "NotFound"
   readonly code: 5 = 5
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class AlreadyExists extends GrpcError {
   readonly _tag: "AlreadyExists" = "AlreadyExists"
   readonly code: 6 = 6
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class PermissionDenied extends GrpcError {
   readonly _tag: "PermissionDenied" = "PermissionDenied"
   readonly code: 7 = 7
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class ResourceExhausted extends GrpcError {
   readonly _tag: "ResourceExhausted" = "ResourceExhausted"
   readonly code: 8 = 8
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class FailedPrecondition extends GrpcError {
   readonly _tag: "FailedPrecondition" = "FailedPrecondition"
   readonly code: 9 = 9
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class Aborted extends GrpcError {
   readonly _tag: "Aborted" = "Aborted"
   readonly code: 10 = 10
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class OutOfRange extends GrpcError {
   readonly _tag: "OutOfRange" = "OutOfRange"
   readonly code: 11 = 11
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class Unimplemented extends GrpcError {
   readonly _tag: "Unimplemented" = "Unimplemented"
   readonly code: 12 = 12
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class Internal extends GrpcError {
   readonly _tag: "Internal" = "Internal"
   readonly code: 13 = 13
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class Unavailable extends GrpcError {
   readonly _tag: "Unavailable" = "Unavailable"
   readonly code: 14 = 14
   constructor(raw: Input){
       super(omitCode(raw));
   }
}
class DataLoss extends GrpcError {
   readonly _tag: "DataLoss" = "DataLoss"
   readonly code: 15 = 15
   constructor(raw: Input){
       super(omitCode(raw));
    } 
}
class Unauthenticated extends GrpcError {
   readonly _tag: "Unauthenticated" = "Unauthenticated"
   readonly code: 16 = 16
   constructor(raw: Input){
       super(omitCode(raw));
    } 
}

const RawErrorSchema = Schema.Struct({
    rawMessage: Schema.String,
    details: Schema.Array(Schema.Unknown),
    name: Schema.String,
    code: Schema.Number
})

const isErr = Schema.is(RawErrorSchema, { onExcessProperty: "ignore" });

export type ClientError = 
    | Cancelled
    | Unknown
    | InvalidArgument
    | DeadlineExceeded
    | NotFound
    | AlreadyExists
    | PermissionDenied
    | ResourceExhausted
    | FailedPrecondition
    | Aborted
    | OutOfRange
    | Unimplemented
    | Internal
    | Unavailable
    | DataLoss
    | Unauthenticated

export const refineError = (e: unknown): ClientError => {
    if( isErr(e) ){
        switch(e.code){
            case 1: return new Cancelled(e)
            case 2: return new Unknown(e)
            case 3: return new InvalidArgument(e)
            case 4: return new DeadlineExceeded(e)
            case 5: return new NotFound(e)
            case 6: return new AlreadyExists(e)
            case 7: return new PermissionDenied(e)
            case 8: return new ResourceExhausted(e)
            case 9: return new FailedPrecondition(e)
            case 10: return new Aborted(e)
            case 11: return new OutOfRange(e)
            case 12: return new Unimplemented(e)
            case 13: return new Internal(e)
            case 14: return new Unavailable(e)
            case 15: return new DataLoss(e)
            case 16: return new Unauthenticated(e)
        }
    }
    throw Error("Absurd Error Refined")
}

