import { LitElement, html, css, svg } from "/web_modules/lit-element.js";
import { unsafeHTML } from "/web_modules/lit-html/directives/unsafe-html.js";
import {
  upDownArrow,
  upChevron,
  downChevron,
} from "./six-datatable-svgs-webm.js";


class SixDatatable extends LitElement {
  static get styles() {
    return [];
  }

  _columnProperties() {
    return { show: true, showHeadTitle: true };
  }

  static get properties() {
    return {
      hasExternalDataProvider: { type: Boolean },
      tableCSSClass: { type: Object },
      cssFiles: { type: Array },
      cssClasses: { type: Object },
      plugins: { type: Object },
      columns: { type: Object },
      maxColumns: { type: Number },
      data: { type: Array },
      id: { type: String },
      page: { type: Number },
      totalRows: { type: Number },
      pageSize: { type: Number },

      _triggerFilter: { type: String },
      _triggerPageChange: { type: String },
      _totalPages: { type: Number },
      _data: { type: Array, reflect: false },
      _showingData: { type: Array, reflect: false },
      _showPicker: { type: Boolean, reflect: false },
      _search: { type: String, reflect: false },
      _order: { type: Object, reflect: false },
    };
  }

  constructor() {
    super();
    this._data = [];
    this._showingData = [];
    this._order = {};
    this.columns = {};
    this.cssFiles = [];
    this.plugins = {};
    this.tableCSSClass = {};
  }

  firstUpdated() {
    this._initColumns();
    this._showPicker = false;
  }

  updated(cP) {
    cP.has("data") && this._initData();
    cP.has("_triggerFilter") && this._filterData();
    cP.has("_triggerPageChange") && this._drawPages() && this._displayPage();
  }

  render() {
    return html`

        ${this.cssFiles.map((f) => {
          return html`<link rel="stylesheet" href="${f}" type="text/css" />`;
        })}

        <div class="sdt-container" id="${this.id}">

          <div class="sdt-plugins-container">
            <div class="sdt-plugins">
              <div slot="std-before-plugins-slot">
              </div>
              ${this._columnsPickerSpawner()}
              ${this._paginationPlugin()}
              ${this._searchPlugin()}
              <div slot="std-after-plugins-slot">
              </div>
            </div>
          </div>

          ${this._columnsPickerPlugin()}

          <div class="sdt-table-container ${
            this._showPicker ? "picker-is-open" : ""
          }">
            <table class="${this._getTableClass("table")}">
                <thead class="${this._getTableClass("thead")}">
                <tr class="${this._getTableClass("thead tr")}">
                    ${Object.keys(this.columns).map((colKey) => {
                      return this._showColumn(colKey)
                        ? html`
                            <th
                              class="${this._getTableClass(
                                "thead tr th",
                                colKey
                              )}"
                              @click="${() => this.setOrder(colKey)}"
                            >
                              <span
                                class="${this._getTableClass(
                                  "thead tr th span",
                                  colKey
                                )}"
                                >${this._getColumn(colKey).title}
                                <i>${this._getOrderIcon(colKey)}</i></span
                              >
                            </th>
                          `
                        : "";
                    })}
                </tr>
                </thead>
                <tbody class="${this._getTableClass("tbody")}">
                    ${this._showingData.map((row) => {
                      return html` <tr
                        class="${this._getRowCSSClass(null, row, "tbody tr")}"
                      >
                        ${Object.keys(this.columns).map((colKey) => {
                          return this._showColumn(colKey)
                            ? html`<td
                                class="${this._getRowCSSClass(
                                  colKey,
                                  row,
                                  "tbody tr td"
                                )}"
                              >
                                <span
                                  class="${this._getRowCSSClass(
                                    colKey,
                                    row,
                                    "tbody tr td span"
                                  )}"
                                  @click="${(e) =>
                                    this._cellEmit(
                                      e,
                                      colKey,
                                      "cell-click",
                                      row
                                    )}"
                                >
                                  ${this._getColumnValueForRow(row, colKey)}
                                </span>
                              </td>`
                            : "";
                        })}
                      </tr>`;
                    })}
                </tr>
                </tbody>
            </table>
          </div>
          

        </div>
      `;
  }

  _initColumns() {
    if (this.maxColumns) {
      Object.keys(this.columns).forEach((colKey, colIdx) => {
        const column = this.columns[colKey];
        if (colIdx > this.maxColumns && !column.showAlways) {
          column.show = false;
        }
      });
    }

    this.columns = { ...this.columns };
  }

  _initData() {
    const originalData = this._clone(this.data);
    this._data = originalData;
    this._initPages(originalData);
    this._displayPage();
  }

  _initPages(data) {
    if (!this.hasExternalDataProvider) {
      this.totalRows = data.length;
    }
    this.totalPages = Math.ceil(this.totalRows / this.pageSize);
  }

  _filterData() {
    if (this.hasExternalDataProvider) {
      const customEvent = new CustomEvent("filterData", {
        detail: {
          search: this._search,
          order: this._order,
          page: 1,
        },
        composed: true,
        bubbles: true,
        cancelable: false,
      });

      this.dispatchEvent(customEvent);
      return;
    }

    const originalData = this._clone(this.data);
    let search = this._getSearch();
    let order = this._getOrder();

    let currentData = originalData;

    if (search) {
      search = search.toLowerCase();
      currentData = originalData.filter((row) => {
        let rowValues = Object.values(row).join(" ").toLowerCase();
        return rowValues.indexOf(search) > -1;
      });
    }

    if (order) {
      currentData.sort(this._sortData(order.field, order.direction));
    }

    this._data = currentData;
    this._initPages(this._data);
    this._displayPage(1);
  }

  _getTableClass(elementName, colKey) {
    return colKey &&
      this.tableCSSClass[colKey] &&
      this.tableCSSClass[colKey][elementName]
      ? this.tableCSSClass[colKey][elementName]
      : this.tableCSSClass["_default"] &&
        this.tableCSSClass["_default"][elementName]
      ? this.tableCSSClass["_default"][elementName]
      : "";
  }

  /* Columns */

  _setColumnProperty(col, property, value) {
    this.columns[col][property] = value;
    this.columns = { ...this.columns };
  }

  _getColumn(colKey) {
    return this.columns[colKey];
  }

  _getRowCSSClass(colKey, row, tag) {
    if (row._rowCSSClass && row._rowCSSClass[tag]) {
      return row._rowCSSClass[tag];
    }
    if (!colKey) {
      return;
    }
    return this.columns[colKey].rowCSSClass &&
      this.columns[colKey].rowCSSClass[tag]
      ? this.columns[colKey].rowCSSClass[tag]
      : "";
  }

  _getColumnValueForRow(row, colKey) {
    const column = this.columns[colKey];

    // Fixed html value
    if (column.type && column.type === "html") {
      return unsafeHTML(
        row[colKey] && row[colKey].html ? row[colKey].html : column.html || ""
      );
    }

    // Row-column value
    if (column.dataHandler && this[column.dataHandler]) {
      return this[column.dataHandler](row);
    }

    return row[colKey] ? row[colKey] : null;
  }

  _showColumn(col) {
    const column = this.columns[col];
    return column.show === undefined || column.show;
  }

  _columnIsHTML(colKey) {
    return this._getColumn(colKey).html;
  }

  _columnCanBePicked(colKey) {
    return (
      this._getColumn(colKey).canBePicked === undefined ||
      this._getColumn(colKey).canBePicked
    );
  }

  /* Cells */

  _cellEmit(e, colKey, action, rowData) {
    e.preventDefault();
    e.stopPropagation();
    const eventData = this._columnIsHTML(colKey) ? rowData : rowData[colKey];
    const column = this._getColumn(colKey);

    const customEvent = new CustomEvent("cell-click", {
      detail: {
        colKey,
        // target: e.target.node,
        eventData,
        dataHandler: column.dataHandler || null,
        dataHandlerFunction: column.dataHandler
          ? this[column.dataHandler]
          : null,
      },
      composed: true,
      bubbles: true,
      cancelable: false,
    });

    this.dispatchEvent(customEvent);
  }

  /* plugins */

  _updateTriggerFilter() {
    this._triggerFilter = new Date().getTime().toString();
  }

  // Columns picker
  _handleColumnsPicker() {
    this._showPicker = !this._showPicker;
  }

  _columnsPickerSpawner() {
    return this.plugins.picker && this.plugins.picker.status
      ? html`
          <div
            class="std-plg-columns-picker"
            @click="${this._handleColumnsPicker}"
          >
            <button class="btn btn-blue">
              ${unsafeHTML(this.plugins.picker.label)}
            </button>
          </div>
        `
      : "";
  }

  _columnsPickerPlugin() {
    return html`<div
      class="sdt-columns-picker-container ${this._showPicker
        ? "picker-is-open"
        : ""}"
    >
      <ul class="">
        ${Object.keys(this.columns).map((colKey) => {
          return this._columnCanBePicked(colKey)
            ? html`<li>
                <div
                  class="sdt-columns-picker"
                  @click="${() =>
                    this._setColumnProperty(
                      colKey,
                      "show",
                      !this._showColumn(colKey)
                    )}"
                >
                  <input
                    type="checkbox"
                    ?checked="${this._showColumn(colKey)}"
                  />
                  ${this._getColumn(colKey).title}
                </div>
              </li>`
            : "";
        })}
      </ul>
    </div>`;
  }

  // Filters
  _updateTriggerFilter() {
    this._triggerFilter = new Date().getTime().toString();
  }

  // Search
  _searchPlugin() {
    return this.plugins.search && this.plugins.search.status
      ? html`
          <div class="std-plg-search">
            <input
              @keyup="${this._setSearch}"
              type="search"
              placeholder="${this.plugins.search.label}"
            />
          </div>
        `
      : "";
  }

  _setSearch(e) {
    this._search = e.target.value;
    this._updateTriggerFilter();
  }

  _getSearch() {
    return this._search;
  }

  // Table order

  /**
   * Returns current ordering status
   */
  _getOrder() {
    return this._order;
  }

  /**
   * Sets current ordering status
   * @param {string} field
   */
  setOrder(field) {
    if (!this.plugins.order || !this.plugins.order.status) {
      return;
    }

    let currentOrderBy = this._order.field || null;
    let currentOrderDirection = this._order.direction || null;
    let newDirection;
    let newOrder = {};

    if (currentOrderBy !== field) {
      currentOrderDirection = null;
    }

    switch (currentOrderDirection) {
      case null:
        newDirection = "ASC";
        break;
      case "ASC":
        newDirection = "DESC";
        break;
      case "DESC":
        newDirection = null;
        break;
    }

    if (newDirection === null) {
      newOrder = {};
    } else {
      newOrder = { field, direction: newDirection };
    }

    this._order = newOrder;
    this._updateTriggerFilter();
  }

  /**
   * Returns the icon related to the current ordering status
   * @param {string} colKey
   */
  _getOrderIcon(colKey) {
    if (!this.plugins.order || !this.plugins.order.status) {
      return;
    }

    let currentOrderBy = this._order.field || null;
    let currentOrderDirection = this._order.direction || null;

    if (colKey === currentOrderBy) {
      switch (currentOrderDirection) {
        case null:
          return upDownArrow;
        case "ASC":
          return upChevron;
        case "DESC":
          return downChevron;
      }
    }

    return upDownArrow;
  }

  /**
   * Compare algorithm
   * @param {*} colKey
   * @param {*} order
   */
  _sortData(colKey, order = "ASC") {
    return function innerSort(a, b) {
      if (!a[colKey] || !b[colKey]) {
        return 0;
      }

      const elA =
        typeof a[colKey] === "string" ? a[colKey].toUpperCase() : a[colKey];
      const elB =
        typeof b[colKey] === "string" ? b[colKey].toUpperCase() : b[colKey];

      let comparison = 0;
      if (elA > elB) {
        comparison = 1;
      } else if (elA < elB) {
        comparison = -1;
      }
      return order === "DESC" ? comparison * -1 : comparison;
    };
  }

  // Pagination

  /**
   * Pagination plugin wrapper
   */
  _paginationPlugin() {
    return this.plugins.pagination && this.plugins.pagination.status
      ? html`<div class="std-plg-pagination">
          <div class="pages-container">
            ${this._drawPages()}
          </div>
        </div> `
      : "";
  }

  /**
   * Draws pagination pages
   */
  _drawPages() {
    if (!this.totalPages) {
      return;
    }

    const pages = [];

    let pagesToLeftEnd = this.page - 5 > 0 ? 5 : this.page;
    let leftInterval = this.page - pagesToLeftEnd;


    for (let i = this.page; i > leftInterval; i--) {
      pages.push(
        html`<div
          class="${i === this.page ? "selected-page" : ""}"
          @click="${() => this._requestPage(i)}"
        >
          ${i}
        </div>`
      );
    }

    (this.page > 1) && pages.push(html`<div @click="${() => this._requestPage(this.page-1)}">«</div>`);

    pages.reverse();

    let pagesToRightEnd =
      this.totalPages - this.page > 5 ? 5 : this.totalPages - this.page;
    let rightInterval = this.page + pagesToRightEnd;

    for (let i = this.page + 1; i <= rightInterval; i++) {
      pages.push(
        html`<div
          class="${i === this.page ? "selected-page" : ""}"
          @click="${() => this._requestPage(i)}"
        >
          ${i}
        </div>`
      );
    }

    (this.page < this.totalPages) && pages.push(html`<div @click="${() => this._requestPage(this.page+1)}">»</div>`);

    return pages;
  }

  /**
   * Page request handler
   * @param {Number} page
   */
  _requestPage(page) {
    this.hasExternalDataProvider
      ? this._eDPEmitPageRequest(page)
      : this._displayPage(page);
  }

  /**
   * Event emitted when requesting page and external data provider is enabled
   * @param {Number} page
   */
  _eDPEmitPageRequest(page) {
    const customEvent = new CustomEvent("pageRequest", {
      detail: {
        search: this._search,
        order: this._order,
        page: page,
      },
      composed: true,
      bubbles: true,
      cancelable: false,
    });
    this.dispatchEvent(customEvent);
  }

  /**
   * Sets current page
   * @param {Number} page
   */
  _displayPage(page) {
    this.page = page || this.page || 1;

    if (
      this.hasExternalDataProvider ||
      !this.plugins.pagination ||
      !this.plugins.pagination.status
    ) {
      this._showingData = this._data;
      return;
    }

    let startFrom = this.page === 1 ? 0 : (this.page - 1) * this.pageSize;
    let endTo = this.page * this.pageSize - 1;

    let pageData = [];
    for (let i = startFrom; i <= endTo && i < this._data.length; i++) {
      pageData.push(this._data[i]);
    }

    this._showingData = pageData;
  }

  /* Utils */

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

window.customElements.define("six-datatable", SixDatatable);