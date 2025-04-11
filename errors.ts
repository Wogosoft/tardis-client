import { Data, Schema } from "@effect";

type RawError = {
    rawMessage: string,
    details: readonly unknown[],
    name: string,
}

class GrpcError extends Data.Error<RawError>{}

class Cancelled extends GrpcError {
   readonly _tag: "Cancelled";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Cancelled";
   } 
   get code(): 1 { return 1 }
}
class Unknown extends GrpcError {
   readonly _tag: "Unknown";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Unknown";
   } 
   get code(): 2 { return 2 }
}
class InvalidArgument extends GrpcError {
   readonly _tag: "InvalidArgument";
   constructor(raw: RawError){
       super(raw);
       this._tag = "InvalidArgument";
   } 
   get code(): 3 { return 3 }
}
class DeadlineExceeded extends GrpcError {
   readonly _tag: "DeadlineExceeded";
   constructor(raw: RawError){
       super(raw);
       this._tag = "DeadlineExceeded";
   } 
   get code(): 4 { return 4 }
}
class NotFound extends GrpcError {
   readonly _tag: "NotFound";
   constructor(raw: RawError){
       super(raw);
       this._tag = "NotFound";
   } 
   get code(): 5 { return 5 }
}
class AlreadyExists extends GrpcError {
   readonly _tag: "AlreadyExists";
   constructor(raw: RawError){
       super(raw);
       this._tag = "AlreadyExists";
   } 
   get code(): 6 { return 6 }
}
class PermissionDenied extends GrpcError {
   readonly _tag: "PermissionDenied";
   constructor(raw: RawError){
       super(raw);
       this._tag = "PermissionDenied";
   } 
   get code(): 7 { return 7 }
}
class ResourceExhausted extends GrpcError {
   readonly _tag: "ResourceExhausted";
   constructor(raw: RawError){
       super(raw);
       this._tag = "ResourceExhausted";
   } 
   get code(): 8 { return 8 }
}
class FailedPrecondition extends GrpcError {
   readonly _tag: "FailedPrecondition";
   constructor(raw: RawError){
       super(raw);
       this._tag = "FailedPrecondition";
   } 
   get code(): 9 { return 9 }
}
class Aborted extends GrpcError {
   readonly _tag: "Aborted";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Aborted";
   } 
   get code(): 10 { return 10 }
}
class OutOfRange extends GrpcError {
   readonly _tag: "OutOfRange";
   constructor(raw: RawError){
       super(raw);
       this._tag = "OutOfRange";
   } 
   get code(): 11 { return 11 }
}
class Unimplemented extends GrpcError {
   readonly _tag: "Unimplemented";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Unimplemented";
   } 
   get code(): 12 { return 12 }
}
class Internal extends GrpcError {
   readonly _tag: "Internal";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Internal";
   } 
   get code(): 13 { return 13 }
}
class Unavailable extends GrpcError {
   readonly _tag: "Unavailable";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Unavailable";
   } 
   get code(): 14 { return 14 }
}
class DataLoss extends GrpcError {
   readonly _tag: "DataLoss";
   constructor(raw: RawError){
       super(raw);
       this._tag = "DataLoss";
   } 
   get code(): 15 { return 15 }
}
class Unauthenticated extends GrpcError {
   readonly _tag: "Unauthenticated";
   constructor(raw: RawError){
       super(raw);
       this._tag = "Unauthenticated";
   } 
   get code(): 16 { return 16 }
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

