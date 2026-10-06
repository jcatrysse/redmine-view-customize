require File.expand_path('../../test_helper', __FILE__)

class ViewCustomizeSettingsTest < Redmine::ControllerTest
  tests SettingsController

  fixtures :users, :email_addresses, :roles

  def test_plugin_settings_option_has_a_unique_id_for_its_label
    @request.session[:user_id] = 1
    get :plugin, :params => {:id => 'view_customize'}
    assert_response :success
    # the hidden field and the check box must not share an id: the label points at that id
    assert_select 'label[for=settings_create_api_access_key]', 1
    assert_select '#settings_create_api_access_key', 1
    assert_select 'input[type=checkbox]#settings_create_api_access_key', 1
    assert_select 'input[type=hidden][name="settings[create_api_access_key]"]', 1
  end
end
