class AddUseApiKeyToViewCustomizes < ActiveRecord::Migration[4.2]
  class MigrationViewCustomize < ActiveRecord::Base
    self.table_name = 'view_customizes'
  end

  def up
    add_column :view_customizes, :use_api_key, :boolean, :null => false, :default => false

    # Keep working what already works: a customization whose code reads the key opts in.
    MigrationViewCustomize.reset_column_information
    MigrationViewCustomize.where("code LIKE ?", "%apiKey%").update_all(:use_api_key => true)
  end

  def down
    remove_column :view_customizes, :use_api_key
  end
end
