export function toCamelCase(str: string) {
	if (!str) return '';
	return str
		.toLowerCase()
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

export function capitalizeFirst(str: string) {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}
