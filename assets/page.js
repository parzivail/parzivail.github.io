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
      if (headerId == "comments") return;

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

  // Create a sections sidebar
  let toc = $("<ol></ol>");
  let headerStack = [{ level: 0, list: toc }]; // Stack to track header levels and lists

  $(".s-prose h1, .s-prose h2, .s-prose h3, .s-prose h4, .s-prose h5, .s-prose h6").each(
    function () {
      let headerText = $(this).text();
      let headerId = $(this).attr("id");

      if (!headerId) return;

      let headerLevel = parseInt(this.tagName.substring(1));
      let listItem = $("<li></li>").append(`<a href="#${headerId}">${headerText}</a>`);

      // Find the right place in the hierarchy
      while (headerStack.length > 1 && headerStack[headerStack.length - 1].level >= headerLevel) {
        headerStack.pop(); // Move up the stack if necessary
      }

      let parentList = headerStack[headerStack.length - 1].list;
      let newSubList = $("<ol></ol>");

      parentList.append(listItem);
      listItem.append(newSubList);

      // Push the new sublist onto the stack
      headerStack.push({ level: headerLevel, list: newSubList });
    }
  );

  $("#toc-container").append(toc);

  const anchors = $("body").find(
    ".s-prose h1, .s-prose h2, .s-prose h3, .s-prose h4, .s-prose h5, .s-prose h6"
  );

  $(window).scroll(function () {
    var scrollTop = $(document).scrollTop();

    // highlight the last scrolled-to: set everything inactive first
    for (var i = 0; i < anchors.length; i++) {
      $('nav ol li a[href="#' + $(anchors[i]).attr("id") + '"]').removeClass("scroll-anchored");
    }

    // then iterate backwards, on the first match highlight it and break
    for (var i = anchors.length - 1; i >= 0; i--) {
      if (scrollTop > $(anchors[i]).offset().top - 5) {
        $('nav ol li a[href="#' + $(anchors[i]).attr("id") + '"]').addClass("scroll-anchored");
        break;
      }
    }
  });
});
