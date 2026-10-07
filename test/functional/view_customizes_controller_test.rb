require File.expand_path('../../test_helper', __FILE__)

class ViewCustomizesControllerTest < Redmine::ControllerTest
  fixtures :projects, :users, :email_addresses, :user_preferences, :roles, :members, :member_roles,
           :view_customizes

  # Replace this with your real tests.
  def test_truth
    assert true
  end

  def test_index_requires_admin
    get :index
    assert_response :redirect

    @request.session[:user_id] = 2
    get :index
    assert_response :forbidden
  end

  def test_index_as_admin_has_no_application_menu
    @request.session[:user_id] = 1
    get :index
    assert_response :success
    assert_select 'table.view_customize'
    # admin pages of core have no application menu (self.main_menu = false)
    assert_select '#main-menu', 0
  end

  def test_actions_require_admin
    @request.session[:user_id] = 2

    get :new
    assert_response :forbidden
    assert_no_difference 'ViewCustomize.count' do
      post :create, :params => {:view_customize => {:code => 'x', :insertion_position => 'html_head', :customize_type => 'css'}}
    end
    assert_response :forbidden
    get :show, :params => {:id => 1}
    assert_response :forbidden
    put :update, :params => {:id => 1, :view_customize => {:code => 'changed'}}
    assert_response :forbidden
    assert_equal 'code_001', ViewCustomize.find(1).code
    assert_no_difference 'ViewCustomize.count' do
      delete :destroy, :params => {:id => 1}
    end
    assert_response :forbidden
    put :update_all, :params => {:view_customize => {:is_enabled => 0}}
    assert_response :forbidden
    assert ViewCustomize.find(1).is_enabled
  end

  def test_create_show_update_destroy
    @request.session[:user_id] = 1

    assert_difference 'ViewCustomize.count' do
      post :create, :params => {:view_customize => {
        :path_pattern => '/issues$', :project_pattern => 'ecookbook', :code => 'alert(1)',
        :insertion_position => 'html_bottom', :customize_type => 'javascript', :comments => 'c',
        :is_enabled => 1, :is_private => 1}}
    end
    created = ViewCustomize.order(:id).last
    assert_redirected_to "/view_customizes/#{created.id}"
    assert_equal 1, created.author_id
    assert created.is_private

    get :show, :params => {:id => created.id}
    assert_response :success

    put :update, :params => {:id => created.id, :view_customize => {:code => 'alert(2)', :is_enabled => 0}}
    assert_redirected_to "/view_customizes/#{created.id}"
    created.reload
    assert_equal 'alert(2)', created.code
    assert !created.is_enabled

    assert_difference 'ViewCustomize.count', -1 do
      delete :destroy, :params => {:id => created.id}
    end
    assert_redirected_to '/view_customizes'
  end

  def test_create_with_invalid_values_is_refused
    @request.session[:user_id] = 1

    assert_no_difference 'ViewCustomize.count' do
      post :create, :params => {:view_customize => {
        :path_pattern => '([', :code => '', :insertion_position => 'html_head', :customize_type => 'css'}}
    end
    assert_response :success
    assert_select '#errorExplanation li', 2
  end

  def test_update_all_disables_and_enables_every_customize
    @request.session[:user_id] = 1

    put :update_all, :params => {:view_customize => {:is_enabled => 0}}
    assert_redirected_to '/view_customizes'
    assert_equal 0, ViewCustomize.where(:is_enabled => true).count

    put :update_all, :params => {:view_customize => {:is_enabled => 1}}
    assert_equal ViewCustomize.count, ViewCustomize.where(:is_enabled => true).count
  end

  def test_update_all_without_params_is_refused
    @request.session[:user_id] = 1

    # Rails answers 400 for this in production
    assert_raises(ActionController::ParameterMissing) { put :update_all }
  end

  def test_show_unknown_id_is_404
    @request.session[:user_id] = 1

    # Rails answers 404 for this in production
    assert_raises(ActiveRecord::RecordNotFound) { get :show, :params => {:id => 99999} }
  end

  def test_index_sorts_by_project_pattern
    @request.session[:user_id] = 1
    ViewCustomize.update_all(:project_pattern => '')
    ViewCustomize.find(1).update_columns(:project_pattern => 'bbb')
    ViewCustomize.find(2).update_columns(:project_pattern => 'aaa')

    get :index, :params => {:sort => 'project_pattern,id'}
    assert_response :success
    patterns = css_select('table.view_customize td.project_pattern').map(&:text)
    assert_equal patterns.sort, patterns
    assert_equal 'aaa', patterns.reject(&:blank?).first

    get :index, :params => {:sort => 'project_pattern:desc'}
    assert_equal 'bbb', css_select('table.view_customize td.project_pattern').map(&:text).first
  end
end
