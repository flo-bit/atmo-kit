export const descriptionAttacks = [
	'<script>window.__atmoSecurityProbe = 1</script x>',
	'<ScRiPt>window.__atmoSecurityProbe = 1</ScRiPt extra>',
	'<img src=x onerror="window.__atmoSecurityProbe = 1">',
	'<svg onload="window.__atmoSecurityProbe = 1"><a href="javascript:alert(1)">link</a></svg>',
	'<iframe srcdoc="<script>parent.__atmoSecurityProbe = 1</script>"></iframe>',
	'<math><mtext><table><mglyph><style><!--</style><img src=x onerror="window.__atmoSecurityProbe = 1">',
	'[click](javascript:alert(1)) ![image](https://example.invalid/tracker.png)',
	'&#60;script&#62;alert(1)&#60;/script&#62;\n**bold** `code` # Heading'
];
