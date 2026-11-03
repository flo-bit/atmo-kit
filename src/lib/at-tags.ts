import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';

/** Standard AT Tags draft properties. Identity values are `at://<DID>` URIs. */
export interface AtTagMetadata {
	canonical?: readonly string[];
	alternate?: readonly string[];
	author?: readonly string[];
	me?: readonly string[];
}

/** A resolved record reference; no lexicon-specific fields are needed. */
export interface AtTagRecordRef {
	uri: string;
}

/**
 * Metadata for a page backed by one record, authored by its repository owner.
 * Supply only auxiliary records represented on the page. Throws SyntaxError for
 * non-record or non-DID-based URIs; resolve handles before calling this helper.
 * For multiple canonical records or different authors, supply metadata directly.
 */
export function recordAtTags(
	record: AtTagRecordRef,
	alternates: readonly AtTagRecordRef[] = []
): AtTagMetadata {
	const { repo } = parseCanonicalResourceUri(record.uri);
	const alternate = [...new Set(alternates.map(({ uri }) => uri))].filter(
		(uri) => uri !== record.uri
	);
	for (const uri of alternate) parseCanonicalResourceUri(uri);

	return {
		canonical: [record.uri],
		author: [`at://${repo}`],
		alternate
	};
}
