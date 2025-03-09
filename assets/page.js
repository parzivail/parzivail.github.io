$(document).ready(function () {
  // Set up navigation hamburger for small sizes
  var navigation = $(".js-navigation");
  var hamburgerBtn = $(".js-hamburger-btn");

  hamburgerBtn.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    hamburgerBtn.toggleClass("is-selected");
    navigation.toggleClass("md:d-none");
  });

  // Wrap auto-generated table elements in the correct class
  $(".s-prose table").each(function () {
    $(this).addClass("s-table").wrap("<div class='s-table-container'></div>");
  });

  // Wrap auto-generated code blocks in the correct class
  $(".s-prose pre").each(function () {
    $(this).addClass("s-code-block");
  });

  // Wrap auto-generated header blocks in a block that gives them a permalink anchor
  $(".s-prose h1, .s-prose h2, .s-prose h3, .s-prose h4, .s-prose h5, .s-prose h6").each(
    function () {
      let headerText = $(this).text();
      let headerId = $(this).attr("id") || `header-${Math.random().toString(36)}`;
      let headerTag = $(this).prop("tagName").toLowerCase(); // Get the tag name (h1, h2, etc.)

      let newStructure = $(`
            <div class="d-flex jc-space-between ai-end pe-none stacks-header">
              <${headerTag} class="flex--item fl-grow1 stacks-${headerTag}" id="${headerId}">
                <span class="pe-auto">${headerText}</span>
              </${headerTag}>
              <a class="d-flex flex__center mbn6 s-btn s-btn__muted pe-auto" href="#${headerId}">
                <span class="v-visible-sr">Section titled ${headerText}</span>
                <ion-icon name="link-outline" class="link-icon"></ion-icon>
              </a>
            </div>
        `);

      $(this).replaceWith(newStructure);
    }
  );
});
