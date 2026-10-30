export type ReportReasonType =
	| 'com.atproto.moderation.defs#reasonSpam'
	| 'com.atproto.moderation.defs#reasonViolation'
	| 'com.atproto.moderation.defs#reasonOther';

export interface ReportInput {
	reasonType: ReportReasonType;
	reason?: string;
}

/** Return a user-facing failure from the app's submission adapter. */
export interface ReportFailure {
	message: string;
	needsSignIn?: boolean;
}

export type ReportSubmit = (input: ReportInput) => Promise<void | ReportFailure>;
