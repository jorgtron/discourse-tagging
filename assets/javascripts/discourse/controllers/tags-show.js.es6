import BulkTopicSelection from "discourse/mixins/bulk-topic-selection";

var NavItem, extraNavItemProperties, customNavItemHref;

try {
  NavItem                = require('discourse/models/nav-item').default;
  extraNavItemProperties = require('discourse/models/nav-item').extraNavItemProperties;
  customNavItemHref      = require('discourse/models/nav-item').customNavItemHref;
} catch(e) {
  NavItem = Discourse.NavItem;  // it's not a module in old Discourse code
}

if (extraNavItemProperties) {
  extraNavItemProperties(function(text, opts) {
    if (opts && opts.tagId) {
      return {tagId: opts.tagId};
    } else {
      return {};
    }
  });
}

if (customNavItemHref) {
  customNavItemHref(function(navItem) {
    if (navItem.get('tagId')) {
      var name = navItem.get('name');

      if ( !Discourse.Site.currentProp('filters').contains(name) ) {
        return null;
      }

      var path = "/tags/",
          category = navItem.get("category");

      if(category){
        path += "c/";
        path += Discourse.Category.slugFor(category);
        if (navItem.get('noSubcategories')) { path += '/none'; }
        path += "/";
      }

      path += navItem.get('tagId') + "/l/";
      return path + name.replace(' ', '-');
    } else {
      return null;
    }
  });
}


export default Ember.Controller.extend(BulkTopicSelection, {
  needs: ["application"],

  tag: null,
  list: null,
  canAdminTag: Ember.computed.alias("currentUser.staff"),
  filterMode: null,
  navMode: 'latest',
  loading: false,
  canCreateTopic: false,
  order: 'default',
  ascending: false,
  status: null,
  state: null,
  search: null,
  max_posts: null,
  q: null,

  queryParams: ['order', 'ascending', 'status', 'state', 'search', 'max_posts', 'q'],

  navItems: function() {
    return NavItem.buildList(this.get('category'), {tagId: this.get('tag.id'), filterMode: this.get('filterMode')});
  }.property('category', 'tag.id', 'filterMode'),

  showTagFilter: function() {
    return Discourse.SiteSettings.show_filter_by_tag;
  }.property('category'),

  categories: function() {
    return Discourse.Category.list();
  }.property(),

  showAdminControls: function() {
    return this.get('canAdminTag') && !this.get('category');
  }.property('canAdminTag', 'category'),

  loadMoreTopics() {
    return this.get("list").loadMore();
  },

  canFavorite: true,
  showFavoriteButton: false,
  
  canFavoriteTag: function() {
    
    const self = this;
    var ticker = this.get('tag.id');
    console.log('checking can fav stock:' + ticker);

    Discourse.ajax("/stock/get_users_favorite_stocks", {
          type: "GET",
        }).then(function(data) {
          //console.log(data.stock);
          //console.log('checking can fav stock step 2:' + ticker);
          //data = data.toString;
          
          var favable = true;
          for (var i = data.stock.length - 1; i >= 0; i--) {
            var stock = jQuery.parseJSON(data.stock[i]);
            //console.log('checking can fav stock step 3:' + ticker + i);
            if(ticker.toLowerCase() == stock.symbol.toLowerCase()) { 
              //console.log(ticker + ' is already favorite stock: ' + stock.symbol.toLowerCase()); 
              self.set('canFavorite', false); 
              self.set('showFavoriteButton', true); 
              
            }
          }
          //console.log('favable: ' + favable);          
          //console.log('canfavorite: ' + self.get('canFavorite'));
          //return self.get('canFavorite');
          //return favable;
          self.set('showFavoriteButton', true); 

    });
  }.property('canFavorite'),

  _showFooter: function() {
    this.set("controllers.application.showFooter", !this.get("list.canLoadMore"));
  }.observes("list.canLoadMore"),

  footerMessage: function() {
    if (this.get('loading') || this.get('list.topics.length') !== 0) { return; }

    if (this.get('list.topics.length') === 0) {
      return I18n.t('tagging.topics.none.' + this.get('navMode'), {tag: this.get('tag.id')});
    } else {
      return I18n.t('tagging.topics.bottom.' + this.get('navMode'), {tag: this.get('tag.id')});
    }
  }.property('navMode', 'list.topics.length', 'loading'),

  actions: {
    changeSort(sortBy) {
      if (sortBy === this.get('order')) {
        this.toggleProperty('ascending');
      } else {
        this.setProperties({ order: sortBy, ascending: false });
      }
      this.send('invalidateModel');
    },

    refresh() {
      const self = this;
      // TODO: this probably doesn't work anymore
      return this.store.findFiltered('topicList', {filter: 'tags/' + this.get('tag.id')}).then(function(list) {
        self.set("list", list);
        self.resetSelected();
      });
    },

    deleteTag() {
      const self = this;
      bootbox.confirm(I18n.t("tagging.delete_confirm"), function(result) {
        if (!result) { return; }

        self.get("tag").destroyRecord().then(function() {
          self.transitionToRoute("tags.index");
        }).catch(function() {
          bootbox.alert(I18n.t("generic_error"));
        });
      });
    },

    favoriteTag() {
      const self = this;
      console.log('favoriting');
      //Discourse.ajax("/stock/add_stock_to_users_favorite_stocks?ticker=" + this.get('tag.id') + ".ol", {
       // type: "GET",
      //});
      addStockToUsersFavoriteStocks(this.get('tag.id'));
      self.set('canFavorite', false);
    },
    unFavoriteTag() {
      const self = this;
      console.log('unfavoriting');
      
      removeStockFromUsersFavoriteStocks(this.get('tag.id'));
      
      setTimeout(function(){
        self.set('canFavorite', true); // add a delay since it takes a little time for the server to store the new value
      }, 500);
      
    },


    changeTagNotification(id) {
      const tagNotification = this.get("tagNotification");
      tagNotification.update({ notification_level: id });
    }
  }
});