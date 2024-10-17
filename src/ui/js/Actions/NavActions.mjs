export class NavActions {
    static openBurgerMenu() {
        const menu = document.querySelector(".burger-menu-content");
        menu.classList.remove("hidden");
        const pageContainer = document.querySelector(".page-container");
        pageContainer.classList.add("nopointer");
    }

    static closeBurgerMenu() {
        const menu = document.querySelector(".burger-menu-content");
        menu.classList.add("hidden");
        const pageContainer = document.querySelector(".page-container");
        pageContainer.classList.remove("nopointer");
    }
}