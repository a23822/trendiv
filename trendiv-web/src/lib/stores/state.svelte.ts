export const uiState = $state({
	isSideMenuOpen: false,
	scrollbarWidth: 0,

	toggleSideMenu() {
		this.isSideMenuOpen = !this.isSideMenuOpen;
	},
	closeSideMenu() {
		this.isSideMenuOpen = false;
	}
});
