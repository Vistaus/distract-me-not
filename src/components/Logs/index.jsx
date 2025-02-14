import React, { Component } from 'react';
import { filter } from 'fuzzaldrin-plus';
import { format } from 'date-fns';
import {
  Pane,
  Table,
  Popover,
  Position,
  Menu,
  Text,
  IconButton,
  MoreIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CaretDownIcon,
  TextDropdownButton,
  TickCircleIcon,
  BanCircleIcon,
  RefreshIcon,
  EraserIcon,
  TimeIcon,
} from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { logger } from 'helpers/logger';
import './styles.scss';

const Order = {
  NONE: 'NONE',
  ASC: 'ASC',
  DESC: 'DESC',
};

export class Logs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      list: [],
      searchQuery: '',
      orderedColumn: 1,
      scrollToIndex: null,
      showDate: false,
      ordering: Order.NONE,
    };
  }

  componentDidMount() {
    this.fetchLogs();
  }

  fetchLogs = (scrollToTop = false) => {
    logger.get().then((logs) => {
      this.setState({
        list: this.getOrderedList(logs),
        scrollToIndex: scrollToTop ? (logs.length > 0 ? 0 : null) : this.state.scrollToIndex,
      });
    });
  }

  getOrderedList = (list) => {
    return list ? list.map((item, index) => ({ id: index + 1, ...item })) : [];
  }

  sort = items => {
    const { ordering } = this.state;
    // Return if there's no ordering.
    if (ordering === Order.NONE) return items;

    // Get the property to sort each item on.
    // By default use the `url` property.
    let propKey = 'url';

    return items.sort((a, b) => {
      let aValue = a[propKey];
      let bValue = b[propKey];

      // Parse money as a number.
      const isMoney = aValue.indexOf('$') === 0;

      if (isMoney) {
        aValue = Number(aValue.slice(1));
        bValue = Number(bValue.slice(1));
      }

      // Support string comparison
      const sortTable = { true: 1, false: -1 };

      // Order ascending (Order.ASC)
      if (this.state.ordering === Order.ASC) {
        return aValue === bValue ? 0 : sortTable[aValue > bValue];
      }

      // Order descending (Order.DESC)
      return bValue === aValue ? 0 : sortTable[bValue > aValue];
    })
  }

  // Filter the items based on the name property.
  filter = items => {
    const searchQuery = this.state.searchQuery.trim();

    // If the searchQuery is empty, return the items as is.
    if (searchQuery.length === 0) return items;

    return items.filter(item => {
      // Use the filter from fuzzaldrin-plus to filter by url.
      const result = filter([item.url], searchQuery);
      return result.length === 1;
    })
  }

  getIconForOrder = order => {
    switch (order) {
      case Order.ASC:
        return ArrowUpIcon;
      case Order.DESC:
        return ArrowDownIcon;
      default:
        return CaretDownIcon;
    }
  }

  handleFilterChange = value => {
    this.setState({ searchQuery: value });
  }

  renderColumnSortButton = ({ orderedColumn, label }) => {
    return (
      <Popover
        position={Position.BOTTOM_LEFT}
        minWidth={160}
        content={({ close }) => (
          <Menu>
            <Menu.OptionsGroup
              title={translate('order')}
              options={[
                { label: translate('ascending'), value: Order.ASC },
                { label: translate('descending'), value: Order.DESC }
              ]}
              selected={
                this.state.orderedColumn === orderedColumn ? this.state.ordering : null
              }
              onChange={value => {
                this.setState({
                  orderedColumn,
                  ordering: value
                });
                // Close the popover when you select a value.
                close();
              }}
            />
          </Menu>
        )}
      >
        <TextDropdownButton
          icon={
            this.state.orderedColumn === orderedColumn
              ? this.getIconForOrder(this.state.ordering)
              : CaretDownIcon
          }
          data-testid="sort-button"
        >
          {label}
        </TextDropdownButton>
      </Popover>
    )
  }

  renderColumnDateButton = ({ label } = {}) => {
    return (
      <Popover
        position={Position.BOTTOM_LEFT}
        minWidth={160}
        content={({ close }) => (
          <Menu>
            <Menu.OptionsGroup
              title={translate('date')}
              options={[
                { label: translate('show'), value: true },
                { label: translate('hide'), value: false }
              ]}
              selected={this.state.showDate}
              onChange={value => {
                this.setState({ showDate: value });
                // Close the popover when you select a value.
                close();
              }}
            />
          </Menu>
        )}
      >
        <TextDropdownButton icon={TimeIcon} data-testid="date-button">
          {label}
        </TextDropdownButton>
      </Popover>
    )
  }

  renderHeaderMenu = ({ close }) => {
    return (
      <Menu>
        <Menu.Group>
          <Menu.Item
            icon={RefreshIcon}
            onSelect={() => {
              this.fetchLogs(true);
              close();
            }}
          >
            {translate('refresh')}
          </Menu.Item>
          <Menu.Item
            icon={EraserIcon}
            onSelect={() => {
              logger.clear();
              this.setState({ list: [], scrollToIndex: null });
              close();
            }}
          >
            {translate('clear')}
          </Menu.Item>
        </Menu.Group>
      </Menu>
    )
  }

  renderRow = ({ row }) => {
    return (
      <Table.Row key={row.id} height={38}>
        <Table.Cell
          flex="none"
          display="flex"
          alignItems="center"
          title={translate(row.blocked ? 'blocked' : 'allowed')}
        >
          {row.blocked ? (
            <BanCircleIcon color="#dc3545" size={16} />
          ) : (
            <TickCircleIcon color="#28a745" size={16} />
          )}
          {this.state.showDate && row.date && (
            <Text marginLeft={8} size={300} fontWeight={500} data-testid="date">
              {format(new Date(row.date), 'dd/MM/yyyy HH:mm:ss')}
            </Text>
          )}
          <Text marginLeft={8} size={300} fontWeight={500} data-testid="url">
            {row.url}
          </Text>
        </Table.Cell>
      </Table.Row>
    )
  }

  render() {
    const items = this.filter(this.sort(this.state.list));

    return (
      <Pane padding={16} height="100%">
        <Table border height="100%">
          <Table.Head padding={0}>
            <Table.SearchHeaderCell
              onChange={this.handleFilterChange}
              value={this.state.searchQuery}
              placeholder={translate('filter') + '...'}
            />
            <Table.HeaderCell flex="none">
              {this.renderColumnSortButton({ orderedColumn: 1 })}
            </Table.HeaderCell>
            <Table.HeaderCell flex="none">
              {this.renderColumnDateButton()}
            </Table.HeaderCell>
            <Table.HeaderCell width={48} flex="none">
              <Popover
                content={({ close }) => this.renderHeaderMenu({ close: close })}
                position={Position.BOTTOM_RIGHT}
                minWidth={160}
              >
                <IconButton icon={MoreIcon} height={24} appearance="minimal" data-testid="list-more-button" />
              </Popover>
            </Table.HeaderCell>
          </Table.Head>
          <Table.VirtualBody scrollToIndex={this.state.scrollToIndex} height="calc(100% - 32px)">
            {items.map(item => this.renderRow({ row: item }))}
          </Table.VirtualBody>
        </Table>
      </Pane>
    )
  }
}
