import BulkTopicSelection from 'discourse/mixins/bulk-topic-selection';

export default Ember.Controller.extend(BulkTopicSelection, {
  tag: null,
  list: null,

  canAdminTag: Ember.computed.alias('currentUser.staff'),

  canFavoriteTag: function() {
    
    const self = this;
    ticker = this.get('tag.id') + ".ol";

    Discourse.ajax("/stock/get_users_favorite_stocks", {
          type: "GET",
        }).then(function(data) {
          console.log(data.stock);
          //data = data.toString;

          for (var i = data.stock.length - 1; i >= 0; i--) {
            stock = jQuery.parseJSON(data.stock[i]);

            if(ticker.toLowerCase() == stock.symbol.toLowerCase()) { console.log(ticker + ' is a favorite stock: ' + stock.symbol.toLowerCase()); return true; }
          }
          console.log(ticker + ' is not a favorite stock');
          return false;

    });

    //console.log(isStockUsersFavorite(this.get('tag.id') + ".ol"));

  },

  loadMoreTopics() {
    return this.get('list').loadMore();
  },

  actions: {
    refresh() {
      const self = this;
      return Discourse.TopicList.list('tags/' + this.get('tag.id')).then(function(list) {
        self.set('list', list);
        self.resetSelected();
      });
    },

    deleteTag() {
      const self = this;
      bootbox.confirm(I18n.t('tagging.delete_confirm'), function(result) {
        if (!result) { return; }

        self.get('tag').destroyRecord().then(function() {
          self.transitionToRoute('tags.index');
        }).catch(function() {
          bootbox.alert(I18n.t('generic_error'));
        });
      });
    },

    favoriteTag() {
      const self = this;
      console.log('favoriting');
      //Discourse.ajax("/stock/add_stock_to_users_favorite_stocks?ticker=" + this.get('tag.id') + ".ol", {
       // type: "GET",
      //});
      addStockToUsersFavoriteStocks(this.get('tag.id') + ".ol");
      

    },


    changeTagNotification(id) {
      const tagNotification = this.get('tagNotification');
      tagNotification.update({ notification_level: id });
    }
  }
});
