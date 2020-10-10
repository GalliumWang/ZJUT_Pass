/**
 * 组件基类，所有主题组件从这个类继承
 * @Author yech
 * @Since 2016/11/3
 */
(function (window, undefined) {

    /**
     * 构造函数
     * @param options 组件的创建选项
     */
    var base = function (options) {
        this.options = options == null ? {} : options;
        this.init();
    };


    base.prototype = {
        options: null,  //创建选项
        element: null,  //创建的组件dom元素

        //初始化方法，在构造函数中调用，渲染并注册事件
        //如果继承的组件初始化中需要做更复杂的事情可以覆写该init方法
        init: function () {
            this.element = this.render();
            $(this.element).data("component", this);
            this.initEvents();
        },

        //渲染方法，返回组件的dom元素，各组件可覆写该方法
        render: function () {
            return null;
        },

        //注册事件方法，各组件可覆写该方法
        initEvents: function () {
        },

        //返回组件的dom元素
        getElement: function () {
            return this.element;
        },

        //显示组件
        show: function () {
            $(this.element).show();
        },

        //隐藏组件
        hide: function () {
            $(this.element).hide();
        },

        //获取组件id
        getId: function () {
            if (this.element !== undefined) {
                return $(this.element).attr("id");
            }
            return "";
        }

    };

    define("InfoPlus.Theme.BaseComponent", base);
})(window);
/**
 * 布局基类 提取了一些desktop版和mobile版的公共方法
 * @Author yech
 * @Since 2019/03/07
 */
(function (window, undefined) {

    var HIDDEN_TEXT = "[Hidden]";
    var PUBLIC = "PUBLIC";

    /**
     * 构造函数
     * @param options 组件的创建选项
     */
    var layout = function (options) {
        this.options = options == null ? {} : options;
        this.init();
    };

    layout.prototype = {

        options: null,          //创建选项
        formEntity: null,       //表单数据
        formRender: null,       //渲染页FormRender对象
        remarkRender: null,     //办理历史RemarkRender对象
        milestoneRender: null,  //里程碑MilestoneRender对象
        name: "default",        //布局名称

        //初始化方法，在构造函数中调用
        //如果继承的组件初始化中需要做更复杂的事情可以覆写该init方法
        init: function () {
        },

        //渲染方法，继承的Layout可覆写该方法
        render: function (formEntity, step) {
        },

        //调整渲染(visibility,class等等)
        adjustRender: function () {
        },

        //办理历史取完后调用，渲染历史相关的模块
        remarkReady: function (options) {
            var progress = options.progress,
                userId = options.userId,
                isDoing = options.isDoing,
                remarks = progress.remarks;
            //处理子流程，获取顶级的父流程，如果没有父流程那么返回null
            var topAncestorProgress = InfoPlus.RemarkRender.processSubProgress(progress);
            //父流程有里程碑就显示父流程的，否则显示子流程自己的
            this.renderMilestone((topAncestorProgress != null && topAncestorProgress.milestones !== undefined) ? topAncestorProgress : progress);
            this.renderRemark(topAncestorProgress != null ? topAncestorProgress : progress, userId);

            if (isDoing && !$$.params.snapshot) {
                this.createStepHelper(progress.remarks);
            }
            this.createCompareHelper(progress);

            //触发办理历史ready事件
            $$.remarkReady(topAncestorProgress != null ? topAncestorProgress : progress);
        },

        //显示表单
        showForm: function () {
            $$.params.holder.form.show();
        },

        //获取布局名称
        getName: function () {
            return this.name;
        },

        //注册事件方法
        initEvents: function () {
            var instance = this;
            //如果标题栏显示，滚动时需要调整header，导航菜单等位置
            $$.visible(function () {
                instance.registerScrollEvent();
                instance.registerResizeEvent();

                //创建表单上已经打的批注，之所以要visible事件里做是因为刷新reviews里有个逻辑，只有可见的控件才显示批注，所以要等表单可见后做
                $IU.createFormReviews($$.entity.step);
                //检查每个view是否高度为0，如果是就不显示了
                $IU.checkViewVisibility(true);
                if (instance.skipSetFocusToFirst === undefined || instance.skipSetFocusToFirst === false) {
                    //将光标设置到第一个可编辑的文本框上，且这个文本框在第一屏(设置focus后不会滚屏)
                    $IU.setFocusToFirstEditableTextBox();
                }
            });
        },

        initOptions: function () {
            this.formEntity = this.options['formEntity'];
            this.formRender = this.options['formRender'];
            //复制params参数到layout对象作为property
            /*
            var params = this.options['params'];
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    this[key] = params[key];
                }
            }
            */
        },

        adjustVisibility: function () {
            if (!$$.visibility.titleBar) {
                $$.params.holder.title.hide();
            }
            if (!$$.visibility.commandBar) {
                $$.params.holder.commandHolder.hide();
            }
            if (!$$.visibility.remark) {
                $$.params.holder.remark.hide();
                $("#nav_menu_history").children("span").addClass("disabled");
            }
            if (!$$.visibility.milestone) {
                $$.params.holder.milestone.hide();
            }
            if (!$$.visibility.floatTool) {
                $("#float_tool").hide();
            }
            if (!$$.visibility.footer) {
                $("#master_footer").hide();
            }
        },

        adjustRenderContentClass: function () {
            if ($("#header_holder").length === 0) {
                $$.params.holder.renderContent.addClass("no_header");
            } else {
                if (!$$.visibility.titleBar) {
                    $$.params.holder.renderContent.addClass("no_title");
                }
            }
        },

        registerResizeEvent: function () {
            var instance = this;
            $(window).resize(function () {
                instance.onResize();
            });
        },

        registerScrollEvent: function () {
            var instance = this;
            if ($$.visibility.titleBar && $$.visibility.commandBar) {
                //渲染页滚动事件
                $(window).scroll(function () {

                    var scrollTop = $(document).scrollTop() || document.documentElement.scrollTop;
                    var $commandHolder = $$.params.holder.commandHolder,
                        $titleBar = $$.params.holder.title,
                        $navMenu = $("#nav_menu"),
                        $header = $commandHolder.parent(),
                        titleBarHeight = $titleBar.height();
                    //如果存在command_holder
                    if ($commandHolder.length > 0) {
                        var titleCommandTop = (scrollTop < titleBarHeight) ? -scrollTop : -titleBarHeight;
                        $header.css("top", titleCommandTop + "px");

                        //调节侧边导航菜单top
                        $navMenu.css("top", (titleCommandTop + $commandHolder.height() + $titleBar.height()) + "px");

                        //控制菜单图标在title和toolbar之间移动
                        var $commandTitleIcon = $("#command_bar_title_icon");
                        //APP内title不显示，title上的菜单图标不存在
                        if ($commandTitleIcon.length > 0) {
                            if (scrollTop > titleBarHeight) {
                                if (!$commandTitleIcon.is(":visible")) {
                                    var isShowing = $commandTitleIcon.data("showing");
                                    if (isShowing !== true) {
                                        $commandTitleIcon.data("showing", true);
                                        $commandTitleIcon.show("slide", {
                                            direction: "left",
                                            complete: function () {
                                                $(this).data("showing", false);
                                            }
                                        }, 300);
                                    }
                                }
                            } else {
                                if ($commandTitleIcon.is(":visible")) {
                                    $commandTitleIcon.hide();
                                }
                            }

                            //垂直滚动时候会引起titleMenu下移到toolbar上，所以需要重新计算可以放几个操作button
                            instance.switchCommandButtonOrMenu();
                        }
                    }
                });
            }
        },

        onResize: function (fromInit) {
            this.switchTitleWidth();
            this.switchCommandButtonOrMenu(fromInit);
        },

        switchCommandButtonOrMenu: function (fromInit) {
            if (!$$.visibility.commandBar) return;
            var getToolCommandTotalWidth = function () {
                var margin = 4,
                    //初始化时候工具按钮的宽度会比最后显示出来的宽度小6px,原因不详，这里的解决方案是如果发现是初始化时候，那么多加6px
                    moreWidth = 6,
                    leftRightCommandButtonMarginWidth = 12; //和命令按钮间间距
                var totalWidth = 0,
                    $commandBar = $("#form_command_bar"),
                    $toolButtons = $commandBar.find("li.tool_button:visible");

                for (var i = 0, len = $toolButtons.length; i < len; i++) {
                    totalWidth += $($toolButtons[i]).outerWidth() + margin + (fromInit ? moreWidth : 0);
                }

                return totalWidth + leftRightCommandButtonMarginWidth;
            };

            var getCommandButtonTotalWidth = function () {
                var $commandBar = $("#form_command_bar"),
                    $commandButton = $commandBar.find("li.command_button"),
                    commandButtonMargin = 2,
                    firstCommandMarginLeft = 6,
                    totalWidth = 0;
                for (var i = 0, len = $commandButton.length; i < len; i++) {
                    totalWidth += $($commandButton[i]).outerWidth() + commandButtonMargin;
                }
                totalWidth += firstCommandMarginLeft;
                return totalWidth;
            };

            var getCommandButtonMaxCount = function () {

                var $commandBar = $("#form_command_bar"),
                    $commandTitleIcon = $("#command_bar_title_icon");
                var totalWidth = document.documentElement.clientWidth,
                    firstCommandMarginLeft = 6,
                    commandButtonWidth = 100,
                    commandButtonMargin = 2;

                var $commandButton = $commandBar.find("li.command_button");
                if ($commandButton.length > 0 && $commandButton.outerWidth() > 0) {
                    commandButtonWidth = $commandButton.outerWidth() + commandButtonMargin;
                }
                totalWidth = totalWidth - firstCommandMarginLeft;

                if ($commandTitleIcon.is(":visible")) {
                    totalWidth = totalWidth - $commandTitleIcon.outerWidth();
                }

                totalWidth = totalWidth - getToolCommandTotalWidth(fromInit);

                var count = Math.floor(totalWidth / commandButtonWidth);
                return count > 1 ? count : 1;

            };


            var $commandButton = $("li.command_button"),
                $CommandMenu = $("#command_menu"),
                commandButtonCount = $commandButton.length;
            //desktop版和mobile版的计算是否需要显示下拉命令菜单还是有区别，移动版里每个命令按钮是固定100px宽，desktop版是可变宽
            if ($$.MOBILE) {
                if (commandButtonCount === 3) {
                    $commandButton.find(".command_button_content").removeClass("smallButton").removeClass("smallFont");
                }
                var maxCommandButtonCount = getCommandButtonMaxCount();
                //手机版，有三个操作按钮，手机屏幕宽度大于360，按照目前的CSS能放的下的按钮小于3个
                if (commandButtonCount === 3 && document.documentElement.clientWidth >= 360 && maxCommandButtonCount < 3) {
                    $commandButton.find(".command_button_content").addClass("smallButton");
                    maxCommandButtonCount = getCommandButtonMaxCount();

                    var useSmallFont = false;
                    $commandButton.find("nobr").each(function () {
                        //如果有6个中文字符，那么在按钮small宽度下必然显示不下，这种情况用小字体
                        if ($IU.chineseLength($(this).text()) === 12) {
                            useSmallFont = true;
                        }
                    });
                    if (useSmallFont) {
                        $commandButton.find(".command_button_content").addClass("smallFont");
                    }
                }
                var hideCommandButton = (maxCommandButtonCount < commandButtonCount);
            } else {
                var $commandTitleIcon = $("#command_bar_title_icon"),
                    totalWidth = getToolCommandTotalWidth(fromInit) + getCommandButtonTotalWidth();
                if ($commandTitleIcon.is(":visible")) {
                    totalWidth += $commandTitleIcon.outerWidth();
                }
                if (totalWidth > document.documentElement.clientWidth) {
                    hideCommandButton = true;
                }
            }

            if (hideCommandButton) {
                $commandButton.addClass("hide");
                $CommandMenu.removeClass("hide");
            } else {
                $commandButton.removeClass("hide");
                $CommandMenu.addClass("hide");
            }

        },

        switchTitleWidth: function () {
            if (!$$.visibility.titleBar) return;
            var windowWidth = $(window).width(),
                $titleDescription = $("#title_description"),
                $titleDescriptionShort = $("#title_description_short"),
                fullDescriptionWidth = $titleDescription.outerWidth(),
                shortDescriptionWidth = $titleDescriptionShort.outerWidth(),
                titleIconWidth = $("#title_icon").outerWidth(),
                changePriorityButtonWidth = $("#changePriorityButton").outerWidth(),
                reservedMargin = 10,
                $title = $("#title_content");

            $title.css("max-width", (windowWidth - (shortDescriptionWidth + titleIconWidth + reservedMargin)) + "px");
            if ($title.outerWidth() + fullDescriptionWidth + titleIconWidth + reservedMargin > windowWidth) {
                $titleDescription.hide();
                $titleDescriptionShort.show();
            } else {
                $titleDescriptionShort.hide();
                $titleDescription.show();
            }
        },

        createTitle: function () {
            if (!$$.visibility.titleBar) return;
            var navMenu = this.createNavMenu();
            var icon = this.createTitleIcon(navMenu);
            this.createTitleContent(icon.commandBarIcon);
            //暂时记一下，以后放layout里
            this.navMenu = navMenu;
        },

        createNavMenu: function () {
            var navMenu = new InfoPlus.Render.NavMenu({
                onSaveClick: $$.save,
                onPrintClick: $$.print,
                onDownloadClick: $$.download,
                onHelpClick: function () {
                    if (typeof window.loadHelp === "function") {
                        loadHelp();
                    }
                },
                onHistoryClick: function () {
                    $IU.scrollTo($$.params.holder.remark.offset().top - 40, 500);
                },
                onRecoverClick: function () {
                    var removeKeys = [];
                    var cookies = document.cookie.split(";");
                    for (var i = 0, len = cookies.length; i < len; i++) {
                        var cookieArray = cookies[i].split("=");
                        if (cookieArray.length > 0) {
                            var key = $IU.trimString(cookieArray[0]);
                            if (key.substr(0, 6) === "noTip_") {
                                removeKeys.push(key);
                            }
                        }
                    }
                    for (i = 0, len = removeKeys.length; i < len; i++) {
                        $IU.cookie.removeCookie(removeKeys[i]);
                    }
                    $IU.messageBox(null, $$.lt("tip.recovered"), null, 300);
                },
                onInstructionClick: $$.instruct
            });


            //创建多VIEW的标签菜单
            var createViewBookmarkCallback = function (label) {
                return function () {
                    $IU.fireClick(label);
                };
            };

            var views = this.formRender.views;
            for (var i = 0; i < views.length; i++) {
                var view = views[i];
                if (view.label != null) {
                    view.menuItem = navMenu.createMenuItem("bookmark", "view_label_" + view.index, view.name, "bookmark", createViewBookmarkCallback(view.label.element));
                }
            }

            $$.params.holder.renderContent.prepend(navMenu.getElement());

            return navMenu;
        },

        createTitleIcon: function (navMenu) {

            var showBackIcon = $IU.showBackIcon();

            var onIconClick = function () {
                if (showBackIcon === true) {
                    $IU.processBack($$.params.back);
                    //window.location.href = $$.params.back;
                    return false;
                } else {
                    var $menu = $(navMenu.getElement());
                    if (!$menu.is(":visible")) {
                        var isShowing = $menu.data("showing");
                        if (isShowing !== true) {
                            $menu.data("showing", true);
                            $menu.show("slide", {
                                direction: "left",
                                complete: function () {
                                    $(this).data("showing", false);
                                }
                            }, 200);

                            var menuLi = $(".infoplus_view_label").not(".infoplus_view_hide").first().data("menuLi");
                            if (menuLi != null) {
                                $menu.find("li.current").removeClass("current");
                                $(menuLi).addClass("current");
                            }
                        }
                    } else {
                        var isHiding = $menu.data("hiding");
                        if (isHiding !== true) {
                            $menu.data("hiding", true);
                            $menu.hide('slide', {
                                direction: "left",
                                complete: function () {
                                    $(this).data("hiding", false);
                                }
                            }, 100);
                        }
                    }
                }
            };


            var icon = new InfoPlus.Render.TitleIcon({
                id: 'title_icon',
                back: showBackIcon,
                onClick: onIconClick
            });

            var commandBarIcon = new InfoPlus.Render.TitleIcon({
                id: 'command_bar_title_icon',
                back: showBackIcon,
                onClick: onIconClick
            });
            commandBarIcon.hide();


            $$.params.holder.title.append(icon.getElement());
            $$.params.holder.commandBar.before(commandBarIcon.getElement());
            return {
                titleIcon: icon,
                commandBarIcon: commandBarIcon
            };
        },

        createTitleContent: function (commandBarIcon) {
            var formEntity = this.formEntity,
                step = formEntity.step,
                workflowName = formEntity.app.name,
                $titleHolder = $$.params.holder.title;

            var title = workflowName + (step.name != null && step.name !== "null" ? ":" + step.name : ""),
                stepInfo = $$.lt("workflow.workflowNo") + ":" + step.entryIdDisplay,
                adminIcon = $$.params.adminView ? ('<i title="' + $$.lt("workflow.admin") + '" class="i-icon-unlock"/>') : '',
                shortDescription = adminIcon + stepInfo;

            if ($$.entity.app.department != null && $$.entity.app.department !== '') {
                stepInfo += ',' + $$.lt("workflow.department") + ":" + $$.entity.app.department;
            }
            if ($$.entity.app.contact != null && $$.entity.app.contact !== '') {
                stepInfo += ',' + $$.lt("workflow.contact") + ":" + $$.entity.app.contact;
            }

            var setTitleClassThemeColor = function (titleClassName, color) {
                $titleHolder.addClass(titleClassName);
                $(commandBarIcon.getElement()).addClass(titleClassName);
                $("meta[name=theme-color]").attr("content", color);
            };

            if (!$$.params.adminView) {
                switch (step.entryStatus) {
                    case InfoPlus.Settings.INSTANCE_STATE_COMPLETE:
                        title += "(" + $$.lt("status.complete") + ")";
                        setTitleClassThemeColor("complete", "#4CAF50");
                        break;
                    case InfoPlus.Settings.INSTANCE_STATE_TERMINATED:
                        title += "(" + $$.lt("status.terminate") + ")";
                        setTitleClassThemeColor("terminated", "#D84315");
                        break;
                    case InfoPlus.Settings.INSTANCE_STATE_OFFLINE:
                        title += "(" + $$.lt("status.offline") + ")";
                        setTitleClassThemeColor("offline", "#F9A825");
                        break;
                    default:
                        if (step.status === 2) {
                            if (step.actionName != null) {
                                title += "(" + step.actionName + (step.actionUserName != null ? "," + step.actionUserName : "") + ")";
                            } else {
                                title += "(" + $$.lt("status.doing") + ")";
                            }
                            setTitleClassThemeColor("doing", "#00ACC1");
                        } else {
                            setTitleClassThemeColor("todo", "#039be5");
                        }
                        break;
                }
            } else {
                title += "(" + $$.lt("status.admin") + ")";
                setTitleClassThemeColor("admin", "#424242");
            }

            //var description = adminIcon + printIcon + stepInfo;
            var description = adminIcon + stepInfo;

            var titleContent = new InfoPlus.Render.TitleContent({
                title: title,
                step: step,
                workflowName: workflowName
            });
            $titleHolder.append(titleContent.getElement());
            var titleDescription = new InfoPlus.Render.TitleDescription({
                full: description,
                compact: shortDescription
            });
            $titleHolder.append(titleDescription.getElement());
        },

        createKillButton: function (commandBar, commandMenu) {

            var afterKill = function () {
                $IU.closeWindow();
            };

            var kill = function () {
                $$.blockUI({ message: "<span class='loading'>" + $$.lt("kill.blockMessage") + "</span>" });
                $$.ajax({
                    type: "POST",
                    url: $$.params.uriKill,
                    data: {
                        stepId: $$.params.formStepId == null ? -1 : $$.params.formStepId,
                        instanceId: $$.params.formInstanceId,
                        rand: Math.random() * 999,
                        remark: $("#killRemark").val()

                    },
                    requestMsg: $$.lt("kill.message"),
                    beforeShowErrorMsg: function () {
                        $.unblockUI();
                    }
                }).always(function () {
                    $.unblockUI();
                }).done(function () {
                    var closeButtonText = !$IU.isEmptyStr($$.params.back) ? $$.lt("common.back") : (!$IU.browserCloseable() ? $$.lt("common.ok") : $$.lt("common.close"));
                    $IU.messageBox(null, $$.lt("kill.success"), closeButtonText, 240, afterKill);
                });
            };

            var confirmKill = function () {
                var title = $$.lt("kill.confirmTitle"),
                    ok = $$.lt("common.ok"),
                    cancel = $$.lt("common.cancel"),
                    contentDiv = document.createElement("div"),
                    textDiv = document.createElement("div"),
                    reasonDiv = document.createElement("div"),
                    remarkText = document.createElement("textarea");
                $(textDiv).html($$.hlt("kill.confirm")).addClass("confirm_kill");
                $(reasonDiv).html($$.hlt("kill.reason"));
                $(remarkText).attr("id", "killRemark").attr("rows", "5").css("width", "100%").css("margin-top", "10px");
                $(contentDiv).append(textDiv).append(reasonDiv).append(remarkText);

                var dialog = new InfoPlus.Render.Dialog({
                    title: title,
                    content: contentDiv,
                    maxWidth: 460,
                    buttons: [
                        {
                            name: ok,
                            defaultButton: true,
                            callback: kill
                        },
                        {
                            name: cancel
                        }
                    ]
                });
                dialog.show();
                return false;
            };

            var killButton = new InfoPlus.Render.ActionButton({
                id: "kill",
                text: $$.lt("kill.title"),
                textClass: "kill",
                tip: $$.lt("kill.tip"),
                hide: true,
                onClick: confirmKill
            });

            //顶端的commandBar传进来的是$$.params.holder.commandBar
            if (commandBar instanceof jQuery) {
                commandBar.prepend(killButton.getElement());
            } else {
                //底端浮动的actionBar传进来的是ActionBar对象
                commandBar.appendButton(killButton);
            }


            if (commandMenu !== undefined) {
                commandMenu.addMenuItem({
                    text: $$.lt("kill.title"),
                    title: $$.lt("kill.menuTip"),
                    name: "kill",
                    onClick: confirmKill
                });
            }

        },

        createWithdrawButton: function (commandBar, commandMenu) {

            //disable存草稿菜单
            $("#nav_menu_save").children("span").addClass("disabled");

            var withdraw = function () {
                $$.blockUI({ message: "<span class='loading'>" + $$.lt("withdraw.blockMessage") + "</span>" });
                $$.ajax({
                    type: "POST",
                    url: $$.params.uriWithdraw,
                    data: {
                        stepId: $$.params.formStepId == null ? -1 : $$.params.formStepId,
                        rand: Math.random() * 999
                    },
                    requestMsg: $$.lt("withdraw.message"),
                    beforeShowErrorMsg: function () {
                        $.unblockUI();
                    }
                }).always(function () {
                    $.unblockUI();
                }).done(function (data) {
                    $IU.messageBox(null, $$.lt("withdraw.success"), null, 240, function () {
                        if (data != null && data.entities != null && data.entities[0] != null && data.entities[0].renderUri != null) {
                            window.location.href = $IU.processUrl(data.entities[0].renderUri);
                        } else {
                            window.location.reload();
                        }
                    });
                });
            };

            var confirmWithdraw = function () {
                var content = $$.hlt("withdraw.confirm"),
                    title = $$.lt("withdraw.title");
                $IU.confirmBox(content, title, $$.lt("common.ok"), 400, withdraw);
                return false;
            };

            var withdrawButton = new InfoPlus.Render.ActionButton({
                id: "withdraw",
                text: $$.lt("withdraw.title"),
                textClass: "withdraw",
                tip: $$.lt("withdraw.tip"),
                hide: true,
                onClick: confirmWithdraw
            });

            //顶端的commandBar传进来的是$$.params.holder.commandBar
            if (commandBar instanceof jQuery) {
                commandBar.prepend(withdrawButton.getElement());
            } else {
                //底端浮动的actionBar传进来的是ActionBar对象
                commandBar.appendButton(withdrawButton);
            }


            if (commandMenu !== undefined) {
                commandMenu.addMenuItem({
                    text: $$.lt("withdraw.title"),
                    title: $$.lt("withdraw.tip"),
                    name: "withdraw",
                    onClick: confirmWithdraw
                });
            }

        },

        createActionButtons: function (commandBar, actions, commandMenu) {
            var actionLength = actions.length;

            //先隐藏，表单渲染完后再计算是否显示
            var hideCommandButton = true;

            var buttonClickEvent = function () {
                var $button = $(this),
                    actionId = $button.data("actionId"),
                    remarkRequired = $button.data("remarkRequired"),
                    skipMessage = $button.data("skipMessage"),
                    inputBarCode = $button.data("inputBarCode"),
                    hideConfirmWhenNoNextStep = $button.data("hideConfirmWhenNoNextStep");
                if (!$button.data("skipValidation")) {
                    if ($IU.doValidate(false) === false) return false;
                }

                var submitForm = function () {
                    var defer = $IU.listSteps(actionId, hideConfirmWhenNoNextStep);
                    defer.done(function (result) {
                        //出选人对话框前用表单上的批注刷新一下$$.params.review
                        $IU.refreshReviewByForm();

                        //备注必填的情况下，即使不用选人，也必须弹出选人对话框
                        if (remarkRequired === true || result.showSelectUser === true) {
                            $IU.showDoAction($button, result);
                        } else {
                            var review = $IU.getReviewData();
                            var submitData = {
                                actionId: actionId,
                                formData: result.jsonData,
                                remark: result.remark || '',
                                rand: Math.random() * 999
                            };
                            if (review != null) {
                                submitData['review'] = $.toJSON(review);
                            }
                            var beforeAction = function () {
                                var docClosed = $IU.closeAllDoc();
                                $$.blockUI({ message: "<span class='loading'>" + $$.lt("submit.submitting") + "</span>" });
                                if (docClosed) {
                                    //如果有关闭的Doc控件就延时3秒提交
                                    return 3000;
                                }
                            };
                            var afterAction = function () {
                                $IU.reopenAllDoc();
                                $.unblockUI();
                            };
                            $$.doAction(submitData, {}, skipMessage, beforeAction, afterAction);
                        }
                    });
                };

                var showInputBarcodeDialog = function () {
                    var contentDiv = document.createElement("div"),
                        span = document.createElement("span"),
                        thingIdInput = document.createElement("input"),
                        $thingIdInput = $(thingIdInput);
                    $(span).text($$.lt("submit.scanBarcode"));
                    $(contentDiv).append(span);
                    span = document.createElement("span");
                    $thingIdInput.attr("id", "form_thing_id_input").attr("type", "text").attr("maxlength", InfoPlus.Controls.Thing.BARCODE_LENGTH);
                    $(span).append(thingIdInput);
                    $(contentDiv).append(span);

                    var buttons = [
                        {
                            name: $$.lt("common.ok"),
                            defaultButton: true,
                            callOnClose: false,
                            preventDefault: true,
                            callback: function () {
                                if ($thingIdInput.val() === "") {
                                    $IU.messageBox(null, $$.lt("submit.inputBarcode"), null, 200, function () {
                                        $thingIdInput.focus();
                                    });
                                    return false;
                                }
                                $$.params.receiveCode = $thingIdInput.val();
                                submitForm();
                            }
                        },
                        {
                            name: $$.lt("common.cancel")
                        }
                    ];

                    var dialog = new InfoPlus.Render.Dialog(
                        {
                            content: contentDiv,
                            maxWidth: 320,
                            buttons: buttons
                        }
                    );
                    dialog.show();
                    setTimeout(function () {
                        $thingIdInput.focus();
                    }, 100);
                };

                //是接收物品的步骤且该按钮是一键办理的action，那么需要输入一维码

                if (inputBarCode === true) {
                    showInputBarcodeDialog();
                } else {
                    submitForm();
                }


                return false;
            };

            //var $titleMenu = $("#command_bar_title_icon");
            for (var i = 0; i < actionLength; i++) {
                var action = actions[i];
                if (action == null) continue;
                action.skipMessage = !((action.descriptionAfterAction || "") !== "" || $$.params.printAfterAction || $$.params.downloadAfterAction);
                action.remarkRequiredTip = $IU.trimString(action.remarkRequiredTip || '');
                //for debug
                action.oneKey = true;
                var actionButton = new InfoPlus.Render.ActionButton({
                    id: action.id,
                    text: action.name,
                    tip: action.description || '',
                    action: action,
                    hide: hideCommandButton,
                    onClick: function () {
                        $$.asynchronousInvoke(buttonClickEvent, this);
                        return false;
                    }
                });

                //顶端的commandBar传进来的是$$.params.holder.commandBar
                if (commandBar instanceof jQuery) {
                    commandBar.prepend(actionButton.getElement());
                } else {
                    //底端浮动的actionBar传进来的是ActionBar对象
                    commandBar.appendButton(actionButton);
                }

                if (commandMenu !== undefined) {
                    commandMenu.addMenuItem({
                        text: action.name,
                        title: action.description,
                        name: action.id,
                        action: action,
                        onClick: function () {
                            $$.asynchronousInvoke(buttonClickEvent, this);
                            $(this).parents(".command_menu").removeClass("open");
                            return false;
                        }
                    });
                }
            }


        },

        createNoActionText: function (step) {
            var hasStepName = function () {
                return step.name != null && step.name !== "null";
            };

            var $commandBar = $$.params.holder.commandBar;
            //if ($commandBar.find("li.command_button").length === 0) {
            var noActionLi = document.createElement("li");
            $(noActionLi).addClass("no_action");
            if (!$$.params.adminView) {
                if (hasStepName() && step.actionUser != null) {
                    var noActionText = $$.lt("command.isDone");
                } else {
                    noActionText = $$.lt("command.noAction");
                }
                $(noActionLi).text(noActionText);
            } else {
                $(noActionLi).addClass("admin").text($$.lt("command.admin"));
            }
            $commandBar.append(noActionLi);
            //}
        },

        createCommandButtonScrollTip: function (commandMenu) {
            var $commandBar = $$.params.holder.commandBar;
            var tip1 = new InfoPlus.Render.ScrollTip({
                toolbarId: $commandBar.attr("id"),
                text: $$.lt("command.helper"),
                left: true
            });
            $commandBar.find(">li.command_button").first().append(tip1.getElement());

            var tip2 = new InfoPlus.Render.ScrollTip({
                toolbarId: $commandBar.attr("id"),
                text: $$.lt("command.helper"),
                left: true
            });

            $(commandMenu.getElement()).append(tip2.getElement());

        },

        //创建命令按钮
        createCommandBarButtons: function () {
            if (!$$.visibility.commandBar) return;

            var formEntity = this.formEntity,
                actions = formEntity['actions'],
                $commandBar = $$.params.holder.commandBar;

            var commandMenu = new InfoPlus.Render.CommandMenu();
            $commandBar.prepend(commandMenu.getElement());

            if ($$.params.killable) {
                this.createKillButton($commandBar, commandMenu);
            }
            if ($$.params.readOnly === true) {
                if ($$.params.withdrawable) {
                    this.createWithdrawButton($commandBar, commandMenu);
                }
            } else {
                if (actions.length > 0) {
                    this.createActionButtons($commandBar, actions, commandMenu);
                }
            }

            if ($commandBar.find("li.command_button").length === 0) {
                this.createNoActionText(formEntity.step);
            }
            this.createCommandButtonScrollTip(commandMenu);
        },

        //创建打印小票按钮（当表单上有物品时）
        createPrintInvoiceButton: function () {
            //移动端不用打印小票
            if ($$.MOBILE || !$$.params.printInvoice) return;

            var printInvoiceButton = new InfoPlus.Render.ToolButton({
                id: 'PrintInvoice',
                iconName: 'box-filled',
                tip: $$.lt("thing.printInvoice"),
                onClick: $$.printInvoice
            });

            $$.params.holder.commandBar.append(printInvoiceButton.getElement());
        },


        //创建比较按钮
        createCompareButton: function () {
            var compareButton = new InfoPlus.Render.ToolButton({
                id: 'Compare',
                iconName: 'my-library-books',
                hide: true,
                disabled: true,
                tip: $$.lt("compare.notSupport"),
                onClick: $$.compare
            });

            $$.params.holder.commandBar.append(compareButton.getElement());
        },

        //创建下载提示信息
        createDownloadHelper: function () {
            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv),
                textDiv = document.createElement("div"),
                $textDiv = $(textDiv);
            if (!$$.params.downloadAfterAction) {
                $textDiv.text($$.lt("download.support"));
            } else {
                $textDiv.text($$.params.printable && !$$.MOBILE ? $$.lt("download.downloadPrintAfterAction") : $$.lt("download.downloadAfterAction"));
            }

            $contentDiv.append(textDiv);

            var helper = new InfoPlus.Render.CommandBarHelper({
                content: contentDiv,
                position: "right",
                dismissType: "printDownload"
            });

            if (helper.element != null) {
                $$.params.holder.commandBar.append(helper.element);
            }

        },

        //创建下载按钮
        createDownloadButton: function () {
            if ($$.params.adminView || $$.MOBILE) return;
            if ($$.params.downloadable && $$.params.downloadAfterAction && !$$.params.readOnly) {
                this.createDownloadHelper();
            }

            var downloadButton = new InfoPlus.Render.ToolButton({
                id: 'Download',
                iconName: 'cloud-download',
                hide: $$.MOBILE && !$$.params.downloadable,
                disabled: !$$.params.downloadable,
                tip: ($$.params.downloadable ? $$.lt("download.support") : $$.lt("download.notSupport")),
                onClick: $$.download
            });

            $$.params.holder.commandBar.append(downloadButton.getElement());
        },

        //创建打印提示信息
        createPrintHelper: function (printButton) {

            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv),
                textDiv = document.createElement("div"),
                $textDiv = $(textDiv);

            $contentDiv.append(textDiv);

            if ($$.params.printAfterAction && !$$.params.readOnly) {
                if (!$$.params.downloadable) {
                    $textDiv.text($$.lt("print.printAfterActionHelper"));
                } else {
                    return;
                }
            } else {
                var linkDiv = document.createElement("div"),
                    $linkDiv = $(linkDiv);
                $textDiv.html($$.lt("print.helper"));
                var linkPrint = document.createElement("a");
                $(linkPrint).attr("href", "#").text($$.lt("print.printNow"));
                $linkDiv.append(linkPrint).addClass("helper_link_div");
                $(linkPrint).click(function () {
                    $IU.fireClick($(printButton.getElement()).children("a")[0]);
                    return false;
                });
                $contentDiv.append(linkDiv);
            }

            var helper = new InfoPlus.Render.CommandBarHelper({
                content: contentDiv,
                position: "right",
                dismissType: "printDownload"
            });

            if (helper.element != null) {
                $("#form_command_bar").append(helper.element);
            }

        },

        //创建打印按钮
        createPrintButton: function () {
            if ($$.params.adminView || $$.MOBILE) return;
            var printButton = new InfoPlus.Render.ToolButton({
                id: 'Print',
                iconName: 'print',
                hide: $$.MOBILE,
                disabled: !$$.params.printable || $$.MOBILE,
                tip: (!$$.params.printable ? $$.lt("print.notSupport") : $$.lt("print.support")),
                onClick: $$.print
            });
            $$.params.holder.commandBar.append(printButton.getElement());

            if (!$$.MOBILE && $$.params.printable) {
                this.createPrintHelper(printButton);
            }
        },

        //创建保存按钮
        createSaveButton: function () {
            //if ($$.MOBILE) return;
            if ($$.params.saveable) {
                var saveButton = new InfoPlus.Render.ToolButton({
                    id: 'Save',
                    iconName: 'save',
                    tip: (!$$.MOBILE ? $$.hlt("save.tip") : undefined),
                    scrollTip: (!$$.MOBILE ? new InfoPlus.Render.ScrollTip({
                        toolbarId: 'form_command_bar',
                        text: $$.lt("save.scrollTip"),
                        left: false
                    }) : undefined),
                    onClick: $$.save
                });

                $$.params.holder.commandBar.append(saveButton.getElement());
            }

        },

        //创建管理按钮
        createAdminButton: function () {
            //if ($$.MOBILE) return;

            if ($$.params.administrable || $$.params.adminView) {
                var adminView = $$.params.adminView;
                var adminButton = new InfoPlus.Render.ToolButton({
                    id: 'Admin',
                    iconName: adminView ? 'lock-open' : 'lock',
                    tip: (!$$.MOBILE ? (adminView ? $$.lt("admin.exit") : $$.lt("admin.manage")) : undefined),
                    onClick: function () {
                        if (adminView) {
                            $IU.openUrl($IU.processUrl($$.params.adminViewUrl));
                        } else {
                            $IU.openUrl($IU.processUrl($$.params.adminUrl));
                        }
                    }
                });
                $$.params.holder.commandBar.append(adminButton.getElement());
            }
        },

        //创建调试提示信息
        createDebugHelper: function () {
            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv),
                textDiv = document.createElement("div"),
                $textDiv = $(textDiv);
            $textDiv.text($$.lt("debug.helperText"));
            $contentDiv.append(textDiv);

            var helper = new InfoPlus.Render.CommandBarHelper({
                content: contentDiv,
                position: "right",
                dismissType: "debugMode"
            });

            if (helper.element != null) {
                $$.params.holder.commandBar.append(helper.element);
            }

        },

        //创建调试按钮
        createDebugButton: function () {
            if ($$.params.isRelease || $$.MOBILE) return;
            var debugButton = new InfoPlus.Render.ToolButton({
                id: 'Debug',
                iconName: 'bug',
                tip: $$.lt("debug.tip"),
                onClick: function () {
                    var $debugConsole = $(".infoplus_debugConsole");
                    if ($debugConsole.length === 0) {
                        new InfoPlus.DebugConsole();
                    } else {
                        $debugConsole.show();
                    }
                }
            });
            $$.params.holder.commandBar.append(debugButton.getElement());

            this.createDebugHelper();
        },

        //创建批注按钮
        createReviewButton: function () {
            //if ($$.MOBILE) return;
            //此处认为可存盘才可批注，逻辑是否正确待验证
            if ($$.params.saveable) {
                var reviewButton = new InfoPlus.Render.ToolButton({
                    id: 'Review',
                    iconName: 'edit',
                    tip: (!$$.MOBILE ? $$.lt("review.buttonTip") : undefined),
                    onClick: $$.review
                });
                $$.params.holder.commandBar.append(reviewButton.getElement());
            }
        },

        //创建浮动工具图标
        createFloatTool: function (formEntity) {
            if ($$.visibility.floatTool !== true) return;
            var floatTool = new InfoPlus.Render.FloatTool({
                workflowName: formEntity.app.name,
                department: formEntity.app.department || '',
                contact: formEntity.app.contact || '',
                feedbackUrl: $$.params.supportUrl,
                entrustUrl: $$.params.entrustUrl,
                instructionUrl: $$.params.instructionUrl
            });
            if (floatTool.getElement() != null) {
                $(document.body).append(floatTool.getElement());
            }
        },

        //创建修改优先级图标
        createChangePriorityIcon: function (step) {
            if ($$.MOBILE) return;
            if (step.allowChangePriority || (step.entryPriority != null && step.entryPriority !== 3)) {
                //当前优先级记录在全局参数里
                $$.params.currentPriority = (step.entryPriority == null ? 3 : step.entryPriority);
                var div = document.createElement("div"),
                    $div = $(div),
                    i = document.createElement("i");
                $(i).addClass("i-icon-flag");
                var title = $$.lt("priority.current", $$.lt("priority.level" + $$.params.currentPriority));
                if (step.allowChangePriority) {
                    title += $$.lt("priority.clickToChange");
                }
                $div.append(i).attr("id", "changePriorityButton").attr("title", title);

                $div.addClass("level" + $$.params.currentPriority);


                $("#title_content").prepend(div);

                if (step.allowChangePriority) {
                    $div.click(function () {

                        $$.ajax({
                            type: "POST",
                            url: $$.params.uriChangePriority,
                            data: {
                                stepId: $$.params.formStepId,
                                priority: ($$.params.currentPriority === 5 ? 3 : 5)
                            },
                            showParseErrMsg: false
                        }).done(function (data) {
                            var currentPriority = data.entities[0];
                            var contentDiv = document.createElement("div");
                            $(contentDiv).text($$.lt("priority.changeSuccessfully", $$.lt("priority.level" + currentPriority)));
                            $div.removeClass("level" + $$.params.currentPriority);

                            $$.params.currentPriority = currentPriority;

                            var title = $$.lt("priority.current", $$.lt("priority.level" + $$.params.currentPriority));
                            if (step.allowChangePriority) {
                                title += $$.lt("priority.clickToChange");
                            }

                            $div.attr("title", title)
                                .addClass("level" + $$.params.currentPriority);

                            new InfoPlus.Tip({
                                content: contentDiv,
                                hideClose: true,
                                color: "#FFFFFF",
                                backgroundColor: "#039be5",
                                position: "left",
                                autoClose: true,
                                unique: true
                            });


                        }).fail(function (data) {
                            var contentDiv = document.createElement("div");
                            $(contentDiv).text($$.lt("priority.changeFailed", data.msg));

                            new InfoPlus.Tip({
                                content: contentDiv,
                                hideClose: true,
                                color: "#FFFFFF",
                                backgroundColor: "#039be5",
                                position: "left",
                                autoClose: true,
                                unique: true
                            });
                        });
                    });
                }
            }
        },

        //创建更多按钮点击弹出的BottomSheet中的反馈信息(这里单独抽出一个方法来是为了App主题里可以覆写)
        createFeedbackDiv: function ($infoDiv, bottomSheet) {
            var getUrl = function (url) {
                var stepId = $$.params.formStepId == null ? -1 : $$.params.formStepId;
                url += ("?stepId=" + stepId);
                if ($$.params.formEntryId != null) {
                    url += ("&entryId=" + $$.params.formEntryId);
                }
                if ($$.params.workflowId != null) {
                    url += ("&workflowId=" + $$.params.workflowId);
                }

                if ($$.params.release != null) {
                    url += ("&workflowRelease=" + $$.params.release);
                }
                return url;
            };


            if ($$.params.supportUrl != null || $$.params.instructionUrl != null) {
                var feedbackDiv = document.createElement("div"),
                    $feedbackDiv = $(feedbackDiv);

                if ($$.params.instructionUrl != null) {
                    var instructionLink = document.createElement("a"),
                        $instructionLink = $(instructionLink);
                    $instructionLink.text($$.lt("common.instruction")).click($$.instruct);
                    $feedbackDiv.append($instructionLink);
                }

                if ($$.params.supportUrl != null) {
                    var feedbackLink = document.createElement("a"),
                        $feedbackLink = $(feedbackLink);
                    $feedbackLink.text($$.lt("workflow.support")).attr("target", "_blank").attr("href", getUrl($$.params.supportUrl));
                    $feedbackDiv.append($feedbackLink);
                }

                $feedbackDiv.addClass("feedback");
                $infoDiv.append(feedbackDiv);
            }
        },

        //创建移动版工具栏上的更多按钮
        createMobileToolButton: function (step) {
            if (!$$.MOBILE) return;
            var layout = this;

            var createMenuItem = function (id, iconName, className, name, onClick, href, target) {
                var li = document.createElement("li"),
                    $li = $(li);
                $li.attr("id", "moreMenu" + id).addClass("more_menu_item");

                var span = document.createElement("span"),
                    i = document.createElement("i");
                $(i).addClass("i-icon-" + iconName);
                $(span).append(i);
                if (className != null) {
                    $(span).addClass("menu_icon_" + className);
                }
                var textSpan = document.createElement("span");
                $(textSpan).addClass("more_menu_text").text(name);

                if (onClick != null) {
                    if (href == null) {
                        $li.append(span).append(textSpan).on("click", onClick);
                    } else {
                        var a = document.createElement("a");
                        $(a).attr("href", href).append(span).append(textSpan).on("click", onClick);
                        if (target == null) {
                            $(a).attr("target", "_self");
                        } else {
                            $(a).attr("target", target);
                        }
                        $li.append(a);
                    }
                } else {
                    a = document.createElement("a");
                    $(a).attr("href", href).append(span).append(textSpan);
                    if (target == null) {
                        $(a).attr("target", "_self");
                    } else {
                        $(a).attr("target", target);
                    }
                    $li.append(a);
                }
                return li;
            };

            var createAdminMenuItem = function ($ul) {
                if ($$.params.administrable || $$.params.adminView) {
                    if ($$.params.adminView) {
                        $ul.append(createMenuItem("Admin", "lock-open", null, $$.lt("admin.exit"), null, $IU.processUrl($$.params.adminViewUrl)));
                    } else {
                        $ul.append(createMenuItem("Admin", "lock", null, $$.lt("admin.manage"), null, $IU.processUrl($$.params.adminUrl)));
                    }
                }
                if ($$.params.administrable) {
                    $ul.append(createMenuItem("ShowAdminRemarks", "history", null, $$.lt("admin.showRemark"), function () {
                        sheet.close(function () {
                            $(".remark_admin,.remark_withdraw,.remark_withdrawn,.remark_kill").addClass("show");
                            $$.params.holder.remark.children("ul").children("li").not(".remark_show_admin").not(":last").css("border-bottom", "");
                        });
                    }));
                }
            };

            var createReviewMenuItem = function ($ul) {
                if ($$.params.saveable) {
                    var menuItem = createMenuItem("Review", "edit", "review", $$.lt("common.review"), function () {
                        sheet.close($$.review);
                    });
                    $(menuItem).find("i.i-icon-edit").css({
                        "position": "relative",
                        "left": "2px",
                        "top": "1px"
                    });
                    if ($$.params.review != null && $$.params.review.length > 0) {
                        $(menuItem).children(".menu_icon_review").addClass("mark_red");
                    }
                    $ul.append(menuItem);
                }
            };

            var createSaveMenuItem = function ($ul) {
                if ($$.params.saveable) {
                    $ul.append(createMenuItem("Save", "save", "save", $$.lt("common.save"), function () {
                        sheet.close($$.save);
                    }));
                }
            };

            var createPrintMenuItem = function ($ul) {
                if (!$$.params.adminView && $$.params.printable) {
                    $ul.append(createMenuItem("Print", "print", "print", $$.lt("common.print"), function () {
                        sheet.close($$.print);
                    }));
                }
            };

            var createDownloadMenuItem = function ($ul) {
                if (!$$.params.adminView && $$.params.downloadable) {
                    $ul.append(createMenuItem("Download", "cloud-download", "download", $$.lt("common.download"), function () {
                        sheet.close($$.download);
                    }));
                }
            };

            var createCompareMenuItem = function ($ul) {
                if ($$.params.sameStepHistoryList != null) {
                    $ul.append(createMenuItem("Compare", "my-library-books", "compare", $$.lt("common.compare"), function () {
                        sheet.close($$.compare);
                    }));
                }
            };

            var createPrintInvoiceMenuItem = function ($ul) {
                if ($$.params.printInvoice) {
                    $ul.append(createMenuItem("PrintInvoice", "box-filled", "printInvoice", $$.lt("common.printInvoice"), function () {
                        sheet.close($$.printInvoice);
                    }));
                }
            };

            var createInfoDiv = function ($infoDiv) {
                var workflowNoDiv = document.createElement("div");
                $(workflowNoDiv).text($$.lt("workflow.workflowNo") + "：" + step.entryIdDisplay);
                $infoDiv.append(workflowNoDiv);
                if ($$.entity.app.department != null && $$.entity.app.department !== '') {
                    var departmentDiv = document.createElement("div");
                    $(departmentDiv).text($$.lt("workflow.department") + "：" + $$.entity.app.department);
                    $infoDiv.append(departmentDiv);
                }
                if ($$.entity.app.contact != null && $$.entity.app.contact !== '') {
                    var contactDiv = document.createElement("div");
                    $(contactDiv).text($$.lt("workflow.contact") + "：" + $$.entity.app.contact);
                    $infoDiv.append(contactDiv);
                }

                // 这里setTimeout(0)是为了sheet这个变量能有值传递到createFeedbackDiv方法里，否则sheet还没创建出来，传进去的参数是undefined
                setTimeout(function () {
                    layout.createFeedbackDiv($infoDiv, sheet);
                }, 0);
            };

            var createContentDiv = function () {
                var contentDiv = document.createElement("div"),
                    ul = document.createElement("ul"),
                    $ul = $(ul),
                    infoDiv = document.createElement("div"),
                    $infoDiv = $(infoDiv);

                $ul.addClass("more_menu_group");
                $infoDiv.addClass("more_info");

                createAdminMenuItem($ul);
                createReviewMenuItem($ul);
                createSaveMenuItem($ul);
                createPrintMenuItem($ul);
                createDownloadMenuItem($ul);
                createCompareMenuItem($ul);
                //移动端不用打印小票功能
                //createPrintInvoiceMenuItem($ul);
                if ($ul.children().length > 0) {
                    $(contentDiv).append(ul);
                }
                createInfoDiv($infoDiv);
                $(contentDiv).append(infoDiv);

                return contentDiv;
            };


            var sheet;

            var moreButton = new InfoPlus.Render.ToolButton({
                id: 'More',
                iconName: 'more-vert',
                onClick: function () {
                    var contentDiv = createContentDiv();
                    sheet = new InfoPlus.Render.Mobile.BottomSheet({
                        content: contentDiv
                    });
                    sheet.show();
                }
            });

            $$.params.holder.commandBar.append(moreButton.getElement());

        },

        createGoTopToolButton: function () {
            var goTopButton = new InfoPlus.Render.ToolButton({
                id: 'GoTop',
                iconName: 'publish',
                onClick: function () {
                    $('html, body').animate({ scrollTop: "0px" }, 400);
                    return false;
                }
            });


            $$.params.holder.commandBar.append(goTopButton.getElement());

            goTopButton.hide();

            var getCommandBarContentWidth = function () {
                var $commandBar = $$.params.holder.commandBar;
                var width = 0;
                $commandBar.children(".command_button:visible,.tool_button:visible").each(function () {
                    if (this !== goTopButton.getElement()) {
                        width += $(this).outerWidth(true);
                    }
                });
                return width;
            };

            $(window).scroll(function () {
                //滚动条滚动超过半屏就出现回到顶端
                var scrollTop = $(window).scrollTop() || document.documentElement.scrollTop;
                if (scrollTop >= $(window).height() / 2) {
                    if (!$(goTopButton.getElement()).is(":visible")) {
                        var goTopButtonWidth = $(goTopButton.getElement()).outerWidth(true);
                        if (goTopButtonWidth + getCommandBarContentWidth() < $$.params.holder.commandBar.outerWidth()) {
                            goTopButton.show();
                        }
                    }
                } else {
                    goTopButton.hide();
                }
            });
        },

        //创建委托（调试）办理提示信息
        createEntrustHelper: function () {
            var entrusts = $$.params.entrusts;
            if (entrusts == null || entrusts.entruster == null) return;
            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv),
                textSpan = document.createElement("span"),
                $textSpan = $(textSpan),
                closeI = document.createElement("i"),
                $closeI = $(closeI);


            var entrusterName = "<span class='entruster'>" + entrusts.entruster.name + "(" + entrusts.entruster.account + ")</span>",
                entrusteeName = entrusts.entrustee.name + "(" + entrusts.entrustee.account + ")";

            var text = "<i class='i-icon-user-secret'/>";
            text += $$.params.entrusts.entrusted ? $$.lt("entrust.tip.entrust", $$.params.entrusts.entruster.name) : $$.lt("entrust.tip.debug", $$.params.entrusts.entruster.name);
            text += "，" + ($$.params.entrusts.entrusted ? $$.lt("entrust.attention", entrusterName, entrusteeName) : $$.lt("entrust.debugAttention", entrusterName, entrusteeName));
            $textSpan.html(text);
            $textSpan.css("cursor", "pointer").css("display", "block");
            $closeI.addClass("i-icon-close2 infoplus_tip_close").attr("title", $$.lt("entrust.close"));
            $contentDiv.append(textSpan).append(closeI);

            var helper = new InfoPlus.Render.CommandBarHelper({
                content: contentDiv,
                position: "top",
                backgroundColor: "#fff9c4"
            });

            var $commandBar = $$.params.holder.commandBar;
            if ($commandBar.length > 0) {
                $commandBar.append(helper.element);
            } else {
                $(document.body).append(helper.element);
            }


            $textSpan.click(function () {
                $IU.chooseEntrust(entrusts);
            });
            $(closeI).click(function () {
                helper.hide();
                return false;
            });
            setTimeout(function () {
                helper.show($commandBar.length === 0);
            }, 1000);
        },


        createFooter: function () {
            if (!$$.visibility.footer) return;
            var footer = new InfoPlus.Render.Footer();
            $$.params.renderContainer.append(footer.getElement());
        },

        renderRemark: function (progress, userId) {
            this.remarkRender = new InfoPlus.RemarkRender({
                stepId: $$.params.formStepId == null ? -1 : $$.params.formStepId,
                instanceId: $$.params.formInstanceId,
                progress: progress,
                userId: userId,//这里用transformer里的userId,而不是$$.params.userId是因为$$.params里面那个userId经过后台处理过，这里传递当前登录人的id更为合理，页面显示也更正确
                readOnly: $$.params.readOnly,
                administrable: $$.params.administrable
            });
            this.remarkRender.draw();
        },

        renderMilestone: function (progress) {
            if (!$$.params.administrable) {
                this.milestoneRender = new InfoPlus.MilestoneRender({
                    milestones: progress.milestones,
                    status: progress.status
                });
                this.milestoneRender.draw();
            }
        },

        createSnapshotHelper: function (step) {
            if (!$$.params.snapshot) return;
            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv),
                textSpan = document.createElement("span"),
                $textSpan = $(textSpan),
                closeI = document.createElement("i"),
                $closeI = $(closeI);

            $textSpan.text($$.lt("snapshot.tip", $IU.dateFormat(new Date(step.actionTime * 1000), "yyyy-MM-dd hh:mm:ss"), step.name));
            $closeI.addClass("i-icon-close2 infoplus_tip_close").attr("title", $$.lt("entrust.close"));
            $contentDiv.append(textSpan).append(closeI);

            var helper = new InfoPlus.Render.CommandBarHelper({
                content: contentDiv,
                position: "top",
                backgroundColor: "#fff9c4"
            });

            var $commandBar = $$.params.holder.commandBar;
            if ($commandBar.length > 0) {
                $commandBar.append(helper.element);
            } else {
                $(document.body).append(helper.element);
            }

            $(closeI).click(function () {
                helper.hide();
                return false;
            });
            setTimeout(function () {
                helper.show($commandBar.length === 0);
            }, 1000);
        },

        createTodoHelper: function (step) {

            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv),
                todoDiv = document.createElement("div"),
                $todoDiv = $(todoDiv);
            $contentDiv.append(todoDiv);

            var linkClose = document.createElement("a");
            $(linkClose).attr("href", "#").text($$.lt("common.notDoAtOnce"));


            if ($IU.isArray(step)) {
                var steps = step;
                $todoDiv.text($$.lt("todo.doSteps"));
                for (var i = 0, len = steps.length; i < len; i++) {
                    var div = document.createElement("div");
                    $(div).text($$.lt("todo.doJob"));
                    linkTodo = document.createElement("a");
                    $(linkTodo).attr("href", "#").data("link", $IU.processUrl(steps[i].renderUri)).text(steps[i].stepName)
                        .click(function () {
                            window.location.href = $(this).data("link");
                            return false;
                        });
                    $(div).append(linkTodo).css("text-align", "left");
                    $contentDiv.append(div);
                }
                div = document.createElement("div");
                $(div).append(linkClose).css("text-align", "right");
                $contentDiv.append(div);
            } else {
                $todoDiv.text($$.lt("todo.doStep") + "“" + step.stepName + "”");
                div = document.createElement("div");
                var linkTodo = document.createElement("a");
                $(linkTodo).attr("href", "#").text($$.lt("common.doAtOnce")).click(function () {
                    window.location.href = $IU.processUrl(step.renderUri);
                    return false;
                });

                $(div).append(linkTodo).append(linkClose).css("text-align", "center").css("margin-top", "5px");

                $(contentDiv).append(div);
            }

            var helper = new InfoPlus.Render.CommandBarHelper({
                content: contentDiv,
                position: "left"
            });

            $$.params.holder.commandBar.append(helper.element);


            $(linkClose).click(function () {
                helper.hide();
                return false;
            });

        },

        createDoingHelper: function (steps) {

            var getUserName = function (step) {
                var userName = step.trueName || step.userName || "",
                    hideUser = (userName === HIDDEN_TEXT);
                if (hideUser) {
                    userName = $$.lt("todo.user");
                } else {
                    if (userName === '') {
                        if (step.userVisibility === PUBLIC) {
                            userName = "<a class='relatedUser' stepId='" + step.formStepId + "'>" + $$.lt("todo.user") + "</a>";
                        } else {
                            userName = $$.lt("todo.user");
                        }
                    }
                }
                return userName;
            };

            var span = document.createElement("span"),
                text = '';

            for (var i = 0, len = steps.length; i < len; i++) {
                var step = steps[i];
                text = getUserName(step) + $$.lt("todo.doing") + (step.stepName != null ? "“" + step.stepName + "”" : "");
                var stepDiv = document.createElement("div"),
                    nobr = document.createElement("nobr");
                $(nobr).html(text);
                $(stepDiv).append(nobr);
                $(span).append(stepDiv);
            }

            $(span).addClass("toolbar_helper left round-corner z-depth-1");

            $(span).find(".relatedUser").click(function () {

                var link = this,
                    stepId = $(this).attr("stepId");

                if (stepId != null) {
                    var csrfToken = $(document).find("meta[itemscope=csrfToken]").attr("content");
                    var requestData = "{candidates(stepId:" + stepId + ",keyword:?){id,name,account,email}}";
                    var candidates = new InfoPlus.Render.Candidates({
                        popper: link,
                        requestUrl: $$.params.graphqlUrl + "?csrfToken=" + csrfToken,
                        requestData: requestData,
                        dataEntityName: "candidates"
                    });
                }
            });

            var div = document.createElement("div");
            $(div).css("margin-top", "6px");
            var linkClose = document.createElement("a");
            $(linkClose).attr("href", "#").text($$.lt("common.dismiss"));
            div.appendChild(linkClose);
            span.appendChild(div);
            var closeTip = function () {
                $(span).hide("fade", function () {
                    $(span).remove();
                });
            };

            $(linkClose).click(function () {
                closeTip();
                return false;
            });

            $(span).click(function () {
                return false;
            });


            var $commandBar = $$.params.holder.commandBar,
                $noAction = $commandBar.children(".no_action");
            if ($noAction.length > 0) {
                $noAction.append(span);
            } else {
                var $commandButton = $commandBar.children(".command_button");
                if ($commandButton.length > 0) {
                    $($commandButton[0]).append(span);
                }
            }
        },

        createStepHelper: function (remarks) {
            var myTodos = [],
                othersDoings = [];
            if ($IU.isArray(remarks)) {
                for (var i = 0, len = remarks.length; i < len; i++) {
                    var remark = remarks[i];
                    if (remark.status === 1) {
                        if (remark.renderUri != null) {
                            myTodos.push(remark);
                        } else {
                            othersDoings.push(remark);
                        }
                    }
                }
            }
            if (myTodos.length > 0) {
                if (myTodos.length === 1) {
                    this.createTodoHelper(myTodos[0]);
                } else {
                    this.createTodoHelper(myTodos);
                }
            } else {
                if (othersDoings.length > 0) {
                    this.createDoingHelper(othersDoings);
                }
            }
        },

        //创建比较提示信息
        createCompareHelper: function (progress) {
            var sameStepList = [];
            if (progress.remarks != null && $$.entity.step != null) {
                var currentStepId = $$.entity.step.flowStepId,
                    currentStepCode = $$.entity.step.code;
                for (var i = 0, len = progress.remarks.length; i < len; i++) {
                    var remark = progress.remarks[i];
                    //当前这个步骤已经在以前被当前办理人办理过，那么就需要比较
                    if (remark.status === 2 && remark.userName === $$.params.userId && remark.stepCode === currentStepCode && remark.formStepId !== currentStepId) {
                        sameStepList.push(remark);
                    }
                }
            }

            if (sameStepList.length > 0) {
                sameStepList.sort(function (a, b) {
                    return b.actionTime - a.actionTime;
                });
                // 合并比较列表(表单初始化时候可能从snapshots带过来比较数据)
                $$.params.sameStepHistoryList = $$.params.sameStepHistoryList || [];
                for (i = 0, len = sameStepList.length; i < len; i++) {
                    $$.params.sameStepHistoryList.push(sameStepList[i]);
                }
            }

            //移动版不显示比较的帮助
            if ($$.MOBILE) {
                return;
            }

            var enableCompareButton = function () {
                compareToolButton.show();
                compareToolButton.enable();
                compareToolButton.setTip($$.lt("compare.support"));
            };

            var disableCompareButton = function () {
                compareToolButton.hide();
                compareToolButton.disable();
                compareToolButton.setTip($$.lt("compare.notSupport"));
            };

            var $compare = $("#FormCommandCompare"),
                compareToolButton = $compare.data("buttonControl");

            if ($compare.length > 0) {
                if ($IU.isArray($$.params.sameStepHistoryList) && $$.params.sameStepHistoryList.length > 0) {
                    enableCompareButton();
                } else {
                    if (sameStepList.length > 0) {
                        enableCompareButton();

                        var contentDiv = document.createElement("div"),
                            $contentDiv = $(contentDiv),
                            textDiv = document.createElement("div"),
                            $textDiv = $(textDiv);
                        $textDiv.html($$.lt("compare.helperText"));
                        $contentDiv.append(textDiv);
                        var linkDiv = document.createElement("div"),
                            $linkDiv = $(linkDiv);
                        var linkCompare = document.createElement("a");
                        $(linkCompare).attr("href", "#").text($$.lt("compare.compareNow"));
                        $linkDiv.append(linkCompare).addClass("helper_link_div");
                        $(linkCompare).click(function () {
                            $IU.fireClick($(compareToolButton.getElement()).children("a")[0]);
                            return false;
                        });
                        $contentDiv.append(linkDiv);

                        var helper = new InfoPlus.Render.CommandBarHelper({
                            content: contentDiv,
                            position: "right",
                            dismissType: "compare"
                        });

                        if (helper.element != null) {
                            $$.params.holder.commandBar.append(helper.element);
                        }

                    } else {
                        disableCompareButton();
                    }
                }
            }
        }

    };

    define("InfoPlus.Theme.BaseLayout", layout);

})(window);

/**
 * 布局
 * @Author yech
 * @Since 2019/02/25
 */
(function (window, undefined) {

    /**
     * @param options 格式               //创建参数
     * ｛
     *  ｝
     */
    var layout = function (options) {
        InfoPlus.Theme.BaseLayout.call(this, options);
        this.initOptions();
    };

    layout.prototype = $.extend(new InfoPlus.Theme.BaseLayout(), {

        render: function (formEntity, step) {
            this.createTitle(formEntity);
            this.createCommandBarButtons();

            this.createToolButtons();
            this.createFloatTool(formEntity);
            this.createChangePriorityIcon(step);

            this.createEntrustHelper();
            this.createSnapshotHelper(step);
            this.createFooter();

            this.initEvents();
        },

        adjustRender: function () {
            this.adjustVisibility();
            this.adjustRenderContentClass();
        },

        createToolButtons: function () {
            this.createPrintInvoiceButton();
            this.createCompareButton();
            this.createDownloadButton();
            this.createPrintButton();
            this.createSaveButton();
            this.createAdminButton();
            this.createReviewButton();
            this.createDebugButton();
        }

    });

    define("InfoPlus.Render.Layout", layout);

})(window);

/**
 * 对话框
 * @Author yech
 * @Since 2016/05/18
 */
(function (window, undefined) {

    /**
     * @param options 格式
     * ｛
     *      container:{$(dom)}                      //对话框的容器
     *      title:{string}                          //标题
     *      titleColor:{string}                     //标题颜色
     *      content:{string}                        //内容，可以是html
     *      footerFlex{boolean}(false)              //底部按钮是否是flex布局，如果不是的话靠右布局,缺省false
     *      maxWidth:{number}                       //对话框最大宽度
     *      autoWidth:{boolean}(false)              //是否设置自动宽度,缺省false
     *      autoHeight:{boolean}(false)             //是否设置自动高度(设置后对话框高度会因内部高度增加而增加),缺省false
     *      onShow:{function}                       //对话框显示完毕后回调
     *      onClose:{function}                      //对话框关闭时候回调
     *      beforeClose:{function}                  //对话框关闭前回调
     *      overflow:{string}                       //设置overflow
     *      lowZindex:{boolean}(false)              //是否用较低的zindex,缺省false
     *      showCloseButton{boolean}(false)         //是否显示右上角关闭按钮,缺省false
     *      showOpenNewButton{boolean}(false)       //是否显示新窗口打开按钮,缺省false
     *      showMinimiseButton{boolean}(false)      //是否显示右上角最小化按钮,缺省false
     *      showFooter{boolean}(true)               //是否显示footer,缺省true
     *      modal{boolean}(true)                    //是否是模式对话框,缺省true
     *      closeOnEscape{boolean}(true)            //是否按escape键时关闭对话框
     *      backgroundNoScroll{boolean}(false)      //是否背景不能滚动，缺省false
     *      noButton:{boolean}(false)               //是否不显示任何按钮
     *      buttons: [                              //按钮对象，显示次序为从右向左
     *          {
     *              name:{string},                  //按钮名称
     *              defaultButton:{boolean}(false), //是否高亮显示,缺省false
     *              callback:{function},            //回调
     *              preventDefault:{boolean}(false),//回调是否可能阻止对话框的关闭,缺省false
     *              callOnClose:{boolean}(false),   //是否在对话框隐藏时候调用该按钮的回调,缺省false
     *              className:{string}              //css类名，用于添加额外的样式
     *          }
     *      ]
     *  ｝
     */
    var dialog = function (options) {
        if (options == null) return;
        this.id = Math.round(Math.random() * 1000000);
        if (options.lowZindex === true) {
            this.baseZindex = 10;
        }
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    dialog.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        id: null,           //对话框id
        baseZindex: 10000,  //最小zindex
        $defaultButton: null,
        detectFlag: null,

        render: function () {
            var dialogDiv = this.createDialog();
            this.element = dialogDiv;
            this.initOptions();
            this.createButtons();
            this.initMaxHeight();
            this.initPosition();
            if (this.options.autoHeight === true) {
                this.initDetectHeightChange();
            }
            return dialogDiv;
        },

        initEvents: function () {
            var instance = this,
                $dialog = $(this.element);
            if (this.options.closeOnEscape !== false) {
                $dialog.on("keydown", function (event) {
                    //可见的时候按escape就关闭
                    if ($dialog.is(":visible") && !event.isDefaultPrevented() && event.keyCode && event.keyCode === 27) {
                        instance.close();
                        event.preventDefault();
                    }
                });
                $(document).on("keydown.dialog", function (event) {
                    if ($dialog.is(":visible") && !event.isDefaultPrevented() && event.keyCode && event.keyCode === 27) {
                        instance.close();
                        event.preventDefault();
                    }
                });
            }

        },
        //重建dialog，用于点击某按钮后可以改变对话框内容和所有按钮
        rebuild: function (options) {
            this.options = options;
            this.initOptions();
            this.createButtons();
            this.initMaxHeight();
            this.initPosition();
        },

        findMaxZIndex: function () {
            var max = this.baseZindex;
            $(".overlay").each(function () {
                var z = parseInt($(this).css("z-index"), 10);
                if (!isNaN(z) && z > max) {
                    max = z;
                }
            });
            return max + 1;
        },

        /**
         * 创建对话框，添加到dom中
         */
        createDialog: function () {
            var container = this.options.container;
            //create dialog
            //create overlay
            var dialogOverlay = null;
            if (!(this.options.modal === false)) {
                dialogOverlay = document.createElement("div");
                var $dialogOverlay = $(dialogOverlay);
                $dialogOverlay.addClass("overlay").css("z-index", this.findMaxZIndex());
            }


            var dialog = document.createElement("div"),
                $dialog = $(dialog),
                id = this.id;
            $dialog.addClass("dialog").css("display", "none").attr("id", "dialog_container_" + id);
            if (dialogOverlay != null) {
                $dialogOverlay.append(dialog);
            }

            if (this.options.modal === false) {
                $dialog.addClass("modeless");
            }


            var dialogBody = document.createElement("div"),
                $dialogBody = $(dialogBody);
            $dialogBody.addClass("dialog_body");
            $dialog.append(dialogBody);

            var dialogFooter = document.createElement("div"),
                $dialogFooter = $(dialogFooter);
            $dialogFooter.addClass("dialog_footer");
            $dialog.append(dialogFooter);

            var dialogTitle = document.createElement("div"),
                $dialogTitle = $(dialogTitle);
            $dialogTitle.addClass("dialog_title clearFix");
            var titleSpan = document.createElement("span"),
                $titleSpan = $(titleSpan);
            $titleSpan.addClass("dialog_title_span");
            $dialogTitle.append(titleSpan);

            var closeButton = document.createElement("a"),
                closeI = document.createElement("i");
            $(closeI).addClass("i-icon-close2");
            $(closeButton).append(closeI).addClass("dialog_close button").attr("href", "#").attr("title", $$.lt("dialog.button.close"));
            $dialogTitle.append(closeButton);

            var instance = this;
            $(closeButton).click(function () {
                instance.close();
                return false;
            });

            var openNewButton = document.createElement("a"),
                openNewI = document.createElement("i");
            $(openNewI).addClass("i-icon-external-link");
            $(openNewButton).append(openNewI).addClass("dialog_openNew button").attr("href", "#");
            $dialogTitle.append(openNewButton);
            if (this.options.openNewUrl !== undefined) {
                $(openNewButton).attr("href", this.options.openNewUrl).attr("target", "_blank").attr("title", $$.lt("dialog.button.openNew"));
            }

            var minimiseButton = document.createElement("a"),
                minimiseI = document.createElement("i");
            $(minimiseI).addClass("i-icon-minus");
            $(minimiseButton).append(minimiseI).addClass("dialog_minimise button").attr("href", "#").attr("title", $$.lt("dialog.button.min"));
            $dialogTitle.append(minimiseButton);

            $(minimiseButton).click(function () {
                instance.minimise(this);
                return false;
            });

            var dialogContent = document.createElement("div"),
                $dialogContent = $(dialogContent);
            $dialogContent.addClass("dialog_content");

            $dialogBody.append(dialogTitle).append(dialogContent);

            //container 如果提供容器参数，就添加到容器中，否则加到document.body中
            if (container != null) {
                if (container instanceof jQuery) {
                    container.append(dialogOverlay != null ? dialogOverlay : dialog);
                } else {
                    $(container).append(dialogOverlay != null ? dialogOverlay : dialog);
                }
            } else {
                document.body.appendChild(dialogOverlay != null ? dialogOverlay : dialog);
            }
            return dialog;
        },

        /**
         * 根据初始化参数设置对话框外观
         */
        initOptions: function () {
            var options = this.options,
                $dialog = $(this.element),
                $dialogBody = $dialog.children(".dialog_body"),
                $dialogContent = $dialogBody.children(".dialog_content"),
                $dialogTitle = $dialogBody.children(".dialog_title"),
                $dialogFooter = $dialog.children(".dialog_footer"),
                $titleSpan = $dialogTitle.children(".dialog_title_span"),
                $dialogCloseButton = $dialogTitle.children(".dialog_close"),
                $dialogOpenNewButton = $dialogTitle.children(".dialog_openNew"),
                $dialogMinimiseButton = $dialogTitle.children(".dialog_minimise");

            if (options.overflow != null) {
                $dialogContent.css("overflow-x", "auto");
                $dialogContent.css("overflow-y", options.overflow);
                $dialog.css("overflow", options.overflow);
            }


            //如果options.onShow不为空，那么在show完毕后调用
            if (options.onShow != null && typeof options.onShow === "function") {
                $dialog.data("onShowCallback", options.onShow);
            }

            //如果options.onClose不为空，那么在close时候调用
            if (options.onClose != null && typeof options.onClose === "function") {
                $dialog.data("onCloseCallback", options.onClose);
            }

            //如果options.beforeClose不为空，那么在close前调用
            if (options.beforeClose != null && typeof options.beforeClose === "function") {
                $dialog.data("beforeCloseCallback", options.beforeClose);
            }

            var content = options.content,
                title = options.title;

            if (options.maxWidth != null) {
                if ($IU.isNumberExactly(options.maxWidth)) {
                    $dialog.css("max-width", options.maxWidth + "px");
                } else {
                    $dialog.css("max-width", options.maxWidth);
                }
            } else {
                $dialog.css("max-width", "none");
            }

            if (options.autoWidth === true) {
                $dialog.css("width", "auto");
            }

            if (options.footerFlex === true) {
                $dialogFooter.addClass("dialog_footer_flex");
            } else {
                $dialogFooter.removeClass("dialog_footer_flex");
            }

            if (options.showFooter === false) {
                $dialogFooter.hide();
                $dialogBody.addClass("disableFooter");
            }

            if (!$IU.isEmptyStr(title)) {
                $dialogTitle.show().addClass("text");
                $titleSpan.text(title);
                if (options.titleColor != null) {
                    $titleSpan.css("color", options.titleColor);
                } else {
                    $titleSpan.css("color", "");
                }
            } else {
                $titleSpan.empty().removeClass("text");
                $dialogTitle.hide();
            }

            if (options.showCloseButton === true) {
                $dialogCloseButton.addClass("show");
                $dialogTitle.show();
            } else {
                $dialogCloseButton.removeClass("show");
            }

            if (options.showOpenNewButton === true) {
                $dialogOpenNewButton.addClass("show");
                $dialogTitle.show();
            } else {
                $dialogOpenNewButton.removeClass("show");
            }

            if (options.showMinimiseButton === true) {
                $dialogMinimiseButton.addClass("show");
                $dialogTitle.show();
            } else {
                $dialogMinimiseButton.removeClass("show");
            }

            $dialogContent.empty();
            if (content instanceof jQuery) {
                content.detach().appendTo($dialogContent);
                if (!content.is(":visible")) {
                    content.show();
                }
            } else {
                $dialogContent.html(content);
            }

            //计算title的宽度
            if (!$IU.isEmptyStr(title)) {
                var totalWidth = $dialog.width();
                var w = 0;
                //代码执行时，对话框尚未显示，所以直接取可见button的宽度会有问题，这里写死25一个
                $dialogTitle.children(".button.show").each(function () {
                    w += 25;
                });
                var pl = parseInt($dialogBody.css("padding-left"), 10),
                    pr = parseInt($dialogBody.css("padding-left"), 10);
                if (!isNaN(pl)) {
                    w += pl;
                }
                if (!isNaN(pr)) {
                    w += pr;
                }
                $titleSpan.css("width", (totalWidth - w) + "px");
            } else {
                $titleSpan.css("width", "0");
            }

        },

        //处理按钮宽度
        processesButtonWidth: function () {
        },

        /**
         * 创建按钮
         */
        createButtons: function () {
            if (this.options.noButton === true) {
                return;
            }
            var buttons = this.options.buttons,          //参数中的按钮配置
                footerFlex = this.options.footerFlex,    //是否flex布局
                $dialog = $(this.element),
                $dialogFooter = $dialog.find(".dialog_footer"),
                instance = this;

            $dialogFooter.empty();

            //create buttons
            if (buttons == null) {
                buttons = [{ name: $$.lt("common.ok") }];
            } else {
                if (!$IU.isArray(buttons)) {
                    buttons = [buttons];
                } else {
                    if (buttons.length === 0) {
                        buttons = [{ name: $$.lt("common.ok") }];
                    }
                }
            }

            for (var i = 0, len = buttons.length; i < len; i++) {
                var button = buttons[i],
                    buttonSpan = document.createElement("button"),
                    $buttonSpan = $(buttonSpan);
                $buttonSpan.addClass("dialog_button").text(button.name !== undefined ? button.name : $$.lt("common.ok"));
                if (button.defaultButton === true || len === 1) {
                    $buttonSpan.addClass("default");
                    this.$defaultButton = $buttonSpan;
                }
                if (button.className !== undefined) {
                    $buttonSpan.addClass(button.className);
                }
                //如果有button有callback且callOnClose为true，那么hide时候要调用该button的callback
                if (button.callOnClose === true && button.callback != null && typeof button.callback === "function") {
                    $dialog.data("callback", button.callback);
                }
                $buttonSpan.data("button", button);
                $dialogFooter.append(buttonSpan);
                if (footerFlex === true) {
                    $buttonSpan.addClass("flex");
                } else {
                    $buttonSpan.addClass("fr");
                }
                var buttonClick = function () {
                    var button = $(this).data("button"),
                        callback = button.callback,
                        preventDefault = button.preventDefault;
                    if (preventDefault === true) {
                        var close = true;
                        if (callback != null && typeof callback === "function") {
                            close = callback();
                        }
                        if (close !== false) {
                            instance.close();
                        } else {
                            //callback返回false，不能关闭，再次绑定事件
                            $(this).one("click", buttonClick);
                        }
                    } else {
                        //如果是callOnClose的，那么回调函数在dialog消失后调用，这里不执行
                        if (!button.callOnClose === true) {
                            if (callback != null && typeof callback === "function") {
                                callback();
                            }
                        }
                        instance.close();
                    }
                    return false;
                };
                $(buttonSpan).one("click", buttonClick);
            }

            if (!footerFlex) {
                this.processesButtonWidth();
            }

        },

        //改变已有的按钮,index为从右向左的序号
        changeButton: function (index, button) {
            var $dialog = $(this.element),
                $dialogFooter = $dialog.find(".dialog_footer"),
                $buttons = $dialogFooter.children(".dialog_button");

            if ($buttons.length > index) {
                var $buttonSpan = $($buttons[index]);
                if (button.name != null) {
                    $buttonSpan.text(button.name);
                }
            }
        },

        /**
         * 计算对话框max-height
         */
        initMaxHeight: function () {
            var $dialog = $(this.element),
                $dialogBody = $dialog.children(".dialog_body"),
                $dialogContent = $dialogBody.children(".dialog_content"),
                $dialogTitle = $dialogBody.children(".dialog_title"),
                $dialogFooter = $dialog.children(".dialog_footer");

            //刚填上title,其height只有10，实际有值情况下应该是33
            var titleHeight = $dialogTitle.outerHeight() > 0 ? 33 : 0;
            var maxHeight = $(window).height() - (titleHeight + $dialogFooter.find("button").outerHeight(true) +
                parseInt($dialogBody.css("padding-top"), 10) + parseInt($dialogBody.css("padding-bottom")));
            $dialogContent.css("max-height", (maxHeight + "px"));
        },

        /**
         * 初始化位置
         */
        initPosition: function () {

        },

        /**
         * 初始化高度监测事件
         */
        initDetectHeightChange: function () {

        },

        getTransitionEndEventName: function () {
            var el = document.createElement('fake'),
                transEndEventNames = {
                    'WebkitTransition': 'webkitTransitionEnd',
                    'transition': 'transitionend',
                    'MozTransition': 'transitionend',
                    'OTransition': 'oTransitionEnd',
                    'msTransition': 'MSTransitionEnd'
                };

            for (var t in transEndEventNames) {
                if (transEndEventNames.hasOwnProperty(t)) {
                    if (el.style[t] !== undefined) {
                        return transEndEventNames[t];
                    }
                }
            }
            return null;
        },

        appear: function () {
            var $dialog = $(this.element),
                $dialogOverlay = $dialog.parent(".overlay");
            $dialogOverlay.show();
        },

        hide: function () {
            var $dialog = $(this.element),
                $dialogOverlay = $dialog.parent(".overlay");
            $dialogOverlay.hide();
        },

        animateHide: function (position, callback) {
            var $dialog = $(this.element),
                $dialogOverlay = $dialog.parent(".overlay");
            $dialog.data("oldPosition", {
                "margin-left": $dialog.css("margin-left"),
                "margin-top": $dialog.css("margin-top"),
                width: $dialog.width(),
                height: $dialog.height()
            });
            $dialog.animate(position, 200, function () {
                $dialogOverlay.hide();
                if (callback != null && (typeof callback === 'function')) {
                    callback();
                }
            });
        },

        animateShow: function (callback) {
            var $dialog = $(this.element),
                $dialogOverlay = $dialog.parent(".overlay");
            $dialogOverlay.show();
            $dialog.animate($dialog.data("oldPosition"), 200, function () {
                $dialog.css("width", "").css("height", "").css("overflow", "");
                if (callback != null && (typeof callback === 'function')) {
                    callback();
                }
            });
        },

        show: function () {
            //如果正在隐藏上一个messageBox,那么等旧的消失后显示新的
            var instance = this;
            var $dialogs = $(".dialog");
            if ($dialogs.data("hiding") === true) {
                $dialogs.one("hideEnd", function () {
                    instance.show();
                });
                return null;
            }


            var $dialog = $(this.element),
                $dialogOverlay = $dialog.parent(".overlay"),
                $dialogBody = $dialog.children(".dialog_body"),
                $dialogContent = $dialogBody.children(".dialog_content");

            $dialogOverlay.addClass("active");
            $dialog.css("display", "block");
            if (this.options.backgroundNoScroll === true) {
                $(document.body).addClass("noScroll");
            }


            setTimeout(function () {

                var afterShow = function () {
                    //调用options.onShow
                    var onShowCallback = $dialog.data("onShowCallback");
                    if (onShowCallback != null && typeof onShowCallback === "function") {
                        onShowCallback();
                    }
                    $dialogOverlay.data("isDialogDisplay", true);
                    //如果发现content里面的内容高度大于max-height(必然出现纵向滚动条，此时会使横行滚动条也出现)，
                    //设置padding-right使横行滚动条尽量不出现(不见得一定不出现，如果宽度大于窗口宽度的95%还是会出现的)
                    var maxHeight = parseInt($dialogContent.css("max-height"), 10);
                    if (!isNaN(maxHeight)) {
                        if ($dialogContent.children().height() > maxHeight) {
                            $dialogContent.css("padding-right", "20px");
                        }
                    }

                    if (instance.options.showMinimiseButton === true) {
                        $dialog.addClass("resizable");
                    }
                };

                $dialog.addClass("display");
                //如果浏览器支持transitionEnd事件，那么在dialog显示出来的动画结束后，将dialogOverlay的isDialogDisplay设置为true，这样在其click事件里可以判断，以防止点了表单某处，弹出窗口又自动消失
                if ($dialog.data("transitionEndEventName") === undefined) {
                    $dialog.data("transitionEndEventName", instance.getTransitionEndEventName());
                }
                var eventName = $dialog.data("transitionEndEventName");
                if (eventName != null) {
                    $dialog.one(eventName, afterShow);
                } else {
                    afterShow();
                }

                if (instance.$defaultButton != null) {
                    instance.$defaultButton.focus();
                }

            }, 100);

        },

        close: function () {
            var $dialog = $(this.element),
                $dialogOverlay = $dialog.parent(".overlay");

            if (this.detectFlag !== null) {
                clearInterval(this.detectFlag);
            }

            //先调用beforeClose回调
            var beforeCloseCallback = $dialog.data("beforeCloseCallback");
            if (beforeCloseCallback != null && typeof beforeCloseCallback === "function") {
                beforeCloseCallback();
            }

            $dialog.data("hiding", true);

            //remove all error prompt first
            $IU.clearErrorPrompt($dialog);
            if (this.options.backgroundNoScroll === true) {
                $(document.body).removeClass("noScroll");
            }

            var hide = function () {
                $dialogOverlay.removeClass("active");
                $dialog.css("display", "none");
                //callback should be got before clear

                //调用options.onClose
                var onCloseCallback = $dialog.data("onCloseCallback");
                if (onCloseCallback != null && typeof onCloseCallback === "function") {
                    onCloseCallback();
                }

                $dialogOverlay.removeClass("active");
                $dialog.css("display", "none");

                //如果按钮是callOnClose的，调用按钮回调函数
                var callback = $dialog.data("callback");
                if (callback != null && typeof callback === "function") {
                    callback();
                }
                //clear dialog
                $dialog.data("beforeCloseCallback", null).data("onCloseCallback", null).data("callback", null).css("max-width", "none").css("width", "");

                $dialog.data("hiding", false);
                $dialog.trigger('hideEnd');
                if ($dialogOverlay.length > 0) {
                    $dialogOverlay.remove();
                } else {
                    $dialog.remove();
                }

                $(document).off("keydown.dialog");
            };

            //先移除resizable，使关闭的动画效果不受resizable的设置影响
            if (this.options.showMinimiseButton === true) {
                $dialog.removeClass("resizable");
            }

            $dialog.removeClass("display");
            //先将背景灰色去掉，防止transitionEnd事件延时发生，目前发现有时候这个事件会推后1秒左右发生，造成界面上1秒多显示灰色overlay层的背景
            //后面调用hide方法时候给overlay层去掉active并且再次加上alpha40的class
            //$dialogOverlay.data("isDialogDisplay", false).removeClass("alpha40");
            $dialogOverlay.data("isDialogDisplay", false);

            if ($dialog.data("transitionEndEventName") === undefined) {
                $dialog.data("transitionEndEventName", this.getTransitionEndEventName());
            }
            var eventName = $dialog.data("transitionEndEventName");

            if (eventName != null) {
                $dialog.one(eventName, hide);
            } else {
                hide();
            }
        },

        minimise: function (minimiseButton) {
            var dialog = this.element,
                $dialog = $(this.element);

            dialog.style.height = $IU.getComputedStyle(dialog, 'height');
            dialog.style.top = $IU.getComputedStyle(dialog, 'top');

            if ($dialog.hasClass("minimise")) {
                //最大化
                setTimeout(function () {
                    $dialog.removeClass("minimise").css("top", "").css("height", "");
                }, 0);

                $(minimiseButton).children("i").removeClass("i-icon-expand").addClass("i-icon-minus");
                $(minimiseButton).attr("title", $$.lt("dialog.button.min"));

                var maxZindex = 0;
                $(".dialog.minimise").each(function () {
                    if (dialog === this) return;
                    var zindex = parseInt($(this).css("z-index"), 10);
                    if (!isNaN(zindex) && zindex > maxZindex) {
                        maxZindex = zindex;
                    }
                });
                maxZindex++;
                $dialog.css("z-index", maxZindex);

            } else {
                //最小化
                //remove all error prompt first
                $IU.clearErrorPrompt($dialog);

                $dialog.css("z-index", "");
                if ($(minimiseButton).data("oldTop") != null) {
                    //$dialog.css("bottom", $(minimiseButton).data("oldBottom"));
                    setTimeout(function () {
                        $dialog.addClass("minimise").css("height", "").css("top", $(minimiseButton).data("oldTop"));
                    }, 0);
                } else {

                    var minTop = $(window).height();
                    $(".dialog.minimise").each(function () {
                        var top = parseInt($(this).css("top"), 10);
                        if (!isNaN(top) && top < minTop) {
                            minTop = top;
                        }
                    });
                    minTop -= 60;

                    setTimeout(function () {
                        $dialog.addClass("minimise").css("height", "").css("top", minTop + "px");
                    }, 0);

                    $(minimiseButton).data("oldTop", minTop + "px");
                }

                $(minimiseButton).attr("title", $$.lt("dialog.button.restore"));
                $(minimiseButton).children("i").removeClass("i-icon-minus").addClass("i-icon-expand");
            }
        }


    });

    define("InfoPlus.Render.BaseDialog", dialog);

})(window);

/**
 * 对话框
 * @Author yech
 * @Since 2016/05/18
 */
(function (window, undefined) {

    var dialog = function (options) {
        InfoPlus.Render.BaseDialog.call(this, options);
    };

    dialog.prototype = $.extend(new InfoPlus.Render.BaseDialog(), {

        /**
         * 初始化位置,desktop版自己计算位置，移动版靠flex定位垂直水平居中
         */
        initPosition: function () {
            var $dialog = $(this.element);
            $dialog.css("margin-left", "-" + $dialog.width() / 2 + "px");
            $dialog.css("margin-top", "-" + ($dialog.outerHeight() / 2) + "px");
        },

        initDetectHeightChange: function () {
            var $dialog = $(this.element);
            $dialog.data("oldHeight", $dialog.outerHeight());

            var tick = function ($dialog) {
                return function () {
                    if ($dialog.data("oldHeight") !== $dialog.outerHeight()) {
                        $dialog.css("margin-top", "-" + ($dialog.outerHeight() / 2) + "px");
                        $dialog.data("oldHeight", $dialog.outerHeight());
                    }
                }
            };


            this.detectFlag = setInterval(tick($dialog), 300);
        }

    });

    define("InfoPlus.Render.Dialog", dialog);

})(window);

/**
 * BaseView 视图页基类
 * @Author yech
 * @Since 2019/06/18
 */

(function (window, undefined) {
    /**
     * @param options 格式               //创建参数
     * ｛
     *      index{int}                  //序号
     *      prefix{string}              //id前缀
     *      render{object}              //view的渲染render
     *      element{domElement}         //view渲染出来的dom
     *      holder{domElement}          //放在哪个dom下面
     *      hasLabel{boolean}           //是否带标签
     *      name{string}                //view名称
     *  ｝
     */

    var view = function (options) {
        if (options == null) return;
        this.options = options;
        this.id = options.prefix + options.index;
        this.prefix = options.prefix;
        this.index = options.index;
        this.render = options.render;
        this.element = options.element;
        this.holder = options.holder;
        this.hasLabel = options.hasLabel;
        this.name = options.render.name;
        this.init();
    };

    view.DATA_CONTROL_OBJECT = "viewControl";
    view.CLASS_VIEW = "infoplus_view";
    view.CLASS_MOBILE_VIEW = "infoplus_mobile_view";

    view.prototype = {

        menuItem: null,         //该view在菜单上的项
        path: "",               //
        dynamicProcessor: new InfoPlus.Dynamics.Processor(), //动态处理器

        init: function () {
            this.addViewClass();
            this.createLabel();
            this.addPrintPagination();
            this.appendViewDom();
            this.appendLabel();
            this.processAutoWidthView();
        },

        //添加viewDom上的样式class
        addViewClass: function () {
            this.element.id = this.id;
            $(this.element).addClass(view.CLASS_VIEW).data(view.DATA_CONTROL_OBJECT, this);
            if ($$.MOBILE && this.render.mobile === true) {
                $(document.body).addClass(InfoPlus.Layout.View.CLASS_MOBILE_VIEW);
            }
            if (!$$.MOBILE) {
                $(this.element).addClass("round-corner").addClass("shadow");
            }
        },

        //添加view的标签
        appendLabel: function () {
            if (this.label == null) return;
            if (this.label.getElement() != null) {
                $(this.element).append(this.label.getElement());
            }
        },

        createLabel: function () {
            if (this.hasLabel) {
                var options = this.options;
                this.label = new InfoPlus.Render.ViewLabel({
                    view: this
                });
            }
        },

        //打印页给第二个view开始的所有view以及其中的第二个以上的repeatSection加上前导强制分页
        addPrintPagination: function () {
            var id = this.id;
            if ($$.PRINT && this.index > 0) {
                $(this.element).css("page-break-before", "always");
                $(this.element).find("." + InfoPlus.Repeat.RepeatControl.CLASS_REPEAT_SECTION).each(function (index) {
                    if (index !== 0) {
                        //只有最上面就是repeatSection的view才能加上强制分页（view下面第一个元素就是重复节）
                        if ($(this).parentsUntil("#" + id).length === 1) {
                            $(this).css("page-break-before", "always");
                        }
                    }
                });
            }
        },

        //将view的dom添加到表单上
        appendViewDom: function () {
            if (!$$.MOBILE) {
                this.holder.appendChild(this.element);
            } else {
                var innerWrapDiv = document.createElement("div");
                $(innerWrapDiv).addClass("infoplus_view_wrap_inner");
                if ($.browser.msie) {
                    //windows phone下IE 滚动条比较粗
                    $(innerWrapDiv).css("top", "17px");
                }
                innerWrapDiv.appendChild(this.element);
                var outerWrapDiv = document.createElement("div");
                $(outerWrapDiv).addClass("infoplus_view_wrap_outer").addClass("shadow");
                outerWrapDiv.appendChild(innerWrapDiv);
                this.holder.appendChild(outerWrapDiv);
            }
        },


        //如果模版中设置了自动宽度，那么将最外层table的width设置成98%
        processAutoWidthView: function () {
            var render = this.render;
            if (render.autoWidth === true && render.width !== undefined) {
                var $tables = $(this.element).find("table");
                $tables.each(function () {
                    //确保是最外层的table
                    if ($(this).parentsUntil("." + InfoPlus.Layout.View.CLASS_VIEW).filter("table").length === 0) {
                        var style = this.getAttribute("style");
                        if (style != null && style !== "") {
                            //先前预处理中已经加入了width:100%的style
                            style = style.replace("width:100%", "width:98%");
                            this.setAttribute("style", style);
                        }
                    }
                });
            }
        },

        getDynamicKeyName: function () {
            return this.id;
        },

        getDynamicContextControlName: function () {
            return this.id;
        },

        setDynamicStyle: function (render, fromInit) {
            this.dynamicProcessor.processDynamicStyle(this, render, undefined, undefined, fromInit);
        },

        doDynamicAction: function (render, fromInit) {
            this.dynamicProcessor.processDynamicAction(this, render, undefined, undefined, fromInit);
        },

        show: function () {
            $(this.element).show();
            $(this.menuItem).show();
            InfoPlus.Render.ViewLabel.refreshLabels();
        },

        hide: function () {
            $(this.element).hide();
            $(this.menuItem).hide();
            InfoPlus.Render.ViewLabel.refreshLabels();
        },

        visible: function (isVisible, fromInit) {
            if (isVisible) {
                $(this.element).removeData("dynamicInvisible");
                this.show();
            } else {
                $(this.element).data("dynamicInvisible", true);
                this.hide();
            }
        }

    };

    define("InfoPlus.Layout.BaseView", view);
})(window);
/**
 * View 视图
 * @Author yech
 * @Since 2019/06/18
 */
(function (window, undefined) {

    var view = function (options) {
        InfoPlus.Layout.BaseView.call(this, options);
    };

    view.DATA_CONTROL_OBJECT = "viewControl";
    view.CLASS_VIEW = "infoplus_view";
    view.CLASS_MOBILE_VIEW = "infoplus_mobile_view";

    view.prototype = $.extend(new InfoPlus.Layout.BaseView(), {

        //添加viewDom上的样式class
        addViewClass: function () {
            this.element.id = this.id;
            $(this.element).addClass(InfoPlus.Layout.View.CLASS_VIEW)
                .addClass("round-corner").addClass("shadow")
                .data(view.DATA_CONTROL_OBJECT, this);
        },

        //将view的dom添加到表单上
        appendViewDom: function () {
            this.holder.appendChild(this.element);
        }

    });

    define("InfoPlus.Layout.View", view);

})(window);

/**
 * 动作按钮
 * @Author yech
 * @Since 2016/10/12
 */
(function (window, undefined) {
    /**
     * @param options 格式            //创建参数
     * ｛
     *      id:{string}             //动作id
     *      text:{string}           //按钮文字
     *      textClass:{string}      //按钮文字class
     *      iconClass:{string}      //按钮图标class
     *      tip:{string}            //提示文字
     *      hide:{boolean}(false)   //是否隐藏
     *      onClick:{function}      //按按钮时候的回调函数
     *  ｝
     */
    var actionButton = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    actionButton.buttonPrefix = "infoplus_action_" + Math.round(Math.random() * 9000 + 1000) + "_";

    actionButton.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var options = this.options;

            //create button
            var li = document.createElement("li");
            $(li).addClass("command_button");
            if (options.hide === true) {
                $(li).addClass("hide");
            }

            var button = document.createElement("a");


            //扫码图标
            if ($$.params.receiveThing === true && this.options.action != null && this.options.action.shortcut === true) {
                var i = document.createElement("i");
                $(i).addClass("i-icon-filter-center-focus").css("margin-right", "3px");
                button.appendChild(i);
            } else {
                //指定图标
                if (this.options.iconClass !== undefined) {
                    var div = document.createElement("div");
                    i = document.createElement("i");
                    $(i).addClass("i-icon-" + this.options.iconClass);
                    $(div).addClass("icon-div").append(i);
                    button.appendChild(div);
                }
            }

            var buttonText = document.createElement("nobr");
            $(buttonText).text(options.text);
            button.appendChild(buttonText);
            $(button).addClass("command_button_content");

            //create tip span
            if (!$$.MOBILE) {
                if ((options.tip || '') !== '') {
                    var tipSpan = document.createElement("span");
                    $(tipSpan).text(options.tip).addClass("toolbar_button_tip").addClass("round-corner").addClass("z-depth-1");
                    button.appendChild(tipSpan);
                }
            }


            //附加的文字显示class
            if (options.textClass != null) {
                $(button).addClass(options.textClass);
                $(li).addClass(options.textClass);
            }

            button.id = button.name = actionButton.buttonPrefix + options.id;
            li.appendChild(button);

            this.putActionInfo(li, options.action);
            return li;
        },


        putActionInfo: function (element, action) {
            if (action == null) return;
            $(element).data("actionId", action.id)
                .data("code", action.code)
                .data("hideConfirmWhenNoNextStep", !!action.hideConfirmWhenNoNextStep)
                .data("skipValidation", !!action.skipValidation)
                .data("remarkRequired", !!action.remarkRequired)
                .data("remarkRequiredTip", $IU.trimString(action.remarkRequiredTip || '') === '' ? $$.lt("submit.mustInputRemark2") : action.remarkRequiredTip)
                .data("actionPrintable", !!action.printable)
                .data("lastRemark", "")
                .data("description", action.description || "")
                .data("skipMessage", action.skipMessage)
                .data("inputBarCode", $$.params.receiveThing === true && action.shortcut === true);
        },

        initEvents: function () {
            var options = this.options;
            if (options.onClick != null && typeof options.onClick === 'function') {
                $(this.element).on("click", options.onClick);
            }
        }

    });

    define("InfoPlus.Render.ActionButton", actionButton);

})(window);

/**
 * 工具按钮
 * @Author yech
 * @Since 2016/12/21
 */
(function (window, undefined) {
    /**
     * @param options 格式            //创建参数
     * ｛
     *      id:{string}                 //id
     *      iconName{string}            //图标名称
     *      hide:{boolean}              //是否隐藏
     *      disabled{boolean}           //是否disable
     *      tip{string}                 //提示(html)
     *      scrollTip{ScrollTip}        //滚动tip对象
     *      helper{
     *          message{string}         //帮助信息(html)
     *          class{string}           //信息内容css类
     *          doAfterAction{boolean}  //是否立即执行
     *          doText{string}          //执行文字
     *      }
     *      onClick:{function}          //按按钮时候的回调函数
     *  ｝
     */
    var toolButton = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    toolButton.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        createHelper: function (options) {
            var instance = this;
            var helperSpan = document.createElement("span"),
                nobr = document.createElement("nobr"),
                $helperSpan = $(helperSpan);

            //$(nobr).html(options.message);
            $helperSpan.html(options.message).addClass("toolbar_helper").addClass("right")
                .addClass("round-corner").addClass("z-depth-1");
            var linkDiv = document.createElement("div");

            if (!options.doAfterAction) {
                var linkPrint = document.createElement("a");
                $(linkPrint).attr("href", "#").text(options.doText);
                $(linkPrint).click(function () {
                    $IU.fireClick(options.command);
                    return false;
                });
                linkDiv.appendChild(linkPrint);
            } else {
                $(linkDiv).css("text-align", "right");
            }
            var linkClose = document.createElement("a");
            $(linkClose).attr("href", "#").text($$.lt("common.dismiss"));
            linkDiv.appendChild(linkClose);
            helperSpan.appendChild(linkDiv);
            $(options.container).append(helperSpan);

            var closeHelper = function () {
                $helperSpan.hide("fade", function () {
                    $helperSpan.remove();
                    $(instance.element).parent().children("li.tool_button").children("a").removeClass("hide_tip");
                });
            };

            $(linkClose).click(function () {
                closeHelper();
                return false;
            });

            $helperSpan.click(function () {
                return false;
            });

        },

        render: function () {
            var options = this.options;
            var li = document.createElement("li"),
                $li = $(li),
                a = document.createElement("a"),
                $a = $(a),
                i = document.createElement("i");
            $(i).addClass("i-icon-" + options.iconName);
            $a.data("buttonControl", this)
                .attr("id", "FormCommand" + options.id).addClass("tool_button")
                .attr("href", "#")
                .append(i);

            if (options.tip != null) {
                var tipSpan = document.createElement("span");
                $(tipSpan).addClass("toolbar_button_tip round-corner z-depth-1").html(options.tip);
                $a.append(tipSpan);
            }

            $li.addClass("tool_button").append(a);


            if (options.helper != null) {
                options.helper.command = a;
                options.helper.container = li;
                this.createHelper(options.helper)
            }

            if (options.scrollTip != null) {
                $li.append(options.scrollTip.getElement());
            }

            if (options.hide) {
                $li.addClass("hide");
            }
            if (options.disabled) {
                $a.addClass("disabled");
            }
            return li;
        },

        disable: function () {
            var $element = $(this.element);
            $element.children("a").addClass("disabled");
            this.options.disabled = true;
        },

        enable: function () {
            var $element = $(this.element);
            $element.children("a").removeClass("disabled");
            this.options.disabled = false;
        },

        show: function () {
            $(this.element).removeClass("hide").show();
        },

        hide: function () {
            $(this.element).addClass("hide").hide();
        },

        mark: function () {
            $(this.element).children("a").addClass("mark_red");
        },

        removeMark: function () {
            $(this.element).children("a").removeClass("mark_red");
        },

        setTip: function (tip) {
            var $element = $(this.element),
                $a = $element.children("a"),
                $span = $a.children("span");
            $span.html(tip);
        },

        getVisibility: function () {
            return $(this.element).children("a").css("visibility");
        },

        initEvents: function () {
            var options = this.options;
            if (options.onClick != null && typeof options.onClick === 'function') {
                $(this.element).click(function () {
                    if ($(this).children("a").hasClass("disabled")) {
                        return false;
                    }
                    options.onClick.call(this);
                    return false;
                });
            }
        }

    });

    define("InfoPlus.Render.ToolButton", toolButton);

})(window);

/**
 * 标题栏图标
 * @Author yech
 * @Since 2016/12/13
 */
(function (window, undefined) {
    /**
     * @param options 格式            //创建参数
     * ｛
     *      id:{string}              //id
     *      back:{boolean}           //是否显示退回图标
     *      onClick:{function}       //按图标时候的回调函数
     *  ｝
     */
    var icon = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    icon.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var options = this.options;

            var div = document.createElement("div"),
                $div = $(div);
            $div.attr("id", options.id).addClass("title_icon");
            var i = document.createElement("i");
            if (options.back === true) {
                $(i).addClass("i-icon-arrow-back");
            } else {
                $(i).addClass("i-icon-menu");
            }

            $div.append(i);
            return div;
        },

        initEvents: function () {
            var options = this.options;
            if (options.onClick != null && typeof options.onClick === 'function') {
                $(this.element).click(options.onClick);
            }
        }

    });

    define("InfoPlus.Render.TitleIcon", icon);

})(window);

/**
 * 标题栏内容
 * @Author yech
 * @Since 2016/12/19
 */
(function (window, undefined) {
    /**
     * @param options 格式               //创建参数
     * ｛
     *      title{string}               //标题(参数会给出缺省标题，如果需要定制标题，请根据step和workflowName自行定制)
     *      step:{step}                 //步骤
     *      workflowName{string}        //流程名称
     *  ｝
     */
    var content = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    content.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var options = this.options;
            var div = document.createElement("div"),
                $div = $(div),
                nobr=document.createElement("nobr");
            $(nobr).text(options.title);
            $div.attr("id", "title_content").append(nobr);
            return div;
        }

    });

    define("InfoPlus.Render.TitleContent", content);

})(window);

/**
 * 标题栏右侧的描述信息
 * @Author yech
 * @Since 2016/12/19
 */
(function (window, undefined) {
    /**
     * @param options 格式           //创建参数
     * ｛
     *      full:{string}           //详细描述
     *      compact:{string}          //缩略描述
     *  ｝
     */
    var description = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    description.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var options = this.options;
            var div = document.createElement("div"),
                fullDiv = document.createElement("div"),
                shortDiv = document.createElement("div");
            $(fullDiv).attr("id", "title_description").html(options.full).hide();
            $(shortDiv).attr("id", "title_description_short").html(options.compact).hide();
            $(div).append(fullDiv).append(shortDiv);
            return div;
        }

    });

    define("InfoPlus.Render.TitleDescription", description);

})(window);

/**
 * 导航菜单
 * @Author yech
 * @Since 2016/12/15
 */
(function (window, undefined) {
    /**
     * @param options 格式            //创建参数
     * ｛
     *      onSaveClick{function}        //按保存时候的回调函数
     *      onPrintClick{function}       //按打印时候的回调函数
     *      onDownloadClick{function}    //按下载时候的回调函数
     *      onHistoryClick{function}     //按历史时候的回调函数
     *      onHelpClick:{function}       //按帮助时候的回调函数
     *      onRecoverClick:{funtion}     //按恢复提示的回调函数
     *  ｝
     */
    var menu = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    menu.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {


        createMenuItem: function (name, id, text, iconName, clickCallback, disable) {
            var li = document.createElement("li"),
                span = document.createElement("span"),
                i = document.createElement("i"),
                spanText = document.createElement("span");

            $(i).addClass("i-icon-" + ((iconName == null) ? name : iconName));
            $(span).addClass("menu_icon").addClass("menu_icon_" + name).append(i);
            $(spanText).addClass("menu_text").text(text);

            $(li).attr("id", "nav_menu_" + ((id == null) ? name : id)).append(span).append(spanText);

            if (!disable && clickCallback != null && typeof clickCallback === 'function') {
                $(li).click(clickCallback);
            }

            $(this.menuGroup).append(li);

            if (disable === true) {
                $(span).addClass("disabled");
            }
            return li;
        },

        render: function () {
            var options = this.options;
            var menuDiv = document.createElement("div"),
                $menuDiv = $(menuDiv);
            $menuDiv.attr("id", "nav_menu").css("display", "none");
            var group = document.createElement("ul"),
                $group = $(group);

            this.menuGroup = group;
            $group.addClass("nav_menu_group");
            this.createMenuItem("history", "history", $$.lt("common.history"), null, options.onHistoryClick);
            this.createMenuItem("save", "save", $$.lt("common.save"), null, options.onSaveClick, !$$.params.saveable);
            this.createMenuItem("print", "print", $$.lt("common.print"), null, options.onPrintClick, $$.params.adminView || !$$.params.printable);
            this.createMenuItem("download", "download", $$.lt("common.download"), "cloud-download", options.onDownloadClick, $$.params.adminView || !$$.params.downloadable);
            if (!$$.MOBILE) {
                this.createMenuItem("recover", "recover", $$.lt("tip.recoverTips"), "replay", options.onRecoverClick);
            }
            this.createMenuItem("instruction", "instruction", $$.lt("common.instruction"), "local-library", options.onInstructionClick, $$.params.instructionUrl == null);
            $menuDiv.append(group);

            group = document.createElement("ul");
            $group = $(group);
            var li = document.createElement("li");
            $(li).addClass("nav_menu_line");
            $group.addClass("nav_menu_group").append(li);
            $menuDiv.append(group);

            group = document.createElement("ul");
            $group = $(group);
            $group.addClass("nav_menu_group")
                .append(this.createMenuItem("help", "help", $$.lt("common.help"), null, options.onHelpClick));
            $menuDiv.append(group);

            return menuDiv;
        },

        //调整导航菜单上不适用的菜单项，此方法不从BaseComponent继承，需要单独实现
        disableUnusedMenuItem: function () {
            var $menu = $(this.element);
            var check = function (id) {
                var $toolButton = $("#" + $$.params.ids[id]);
                if ($toolButton.length === 0 || $toolButton.hasClass("disabled") || $toolButton.parent().hasClass("hide")) {
                    $menu.find("#nav_menu_" + id).children("span").addClass("disabled");
                }
            };
            check("save");
            check("print");
            check("download");

            if (this.options.disableInstruction === true) {
                $menu.find("#nav_menu_instruction").children("span").addClass("disabled");
            }
        }


    });

    define("InfoPlus.Render.NavMenu", menu);

})(window);

/**
 * 命令栏菜单
 * @Author yech
 * @Since 2016/12/20
 */
(function (window, undefined) {
    /**
     * @param options 格式               //创建参数
     * ｛
     *
     *  ｝
     */
    var menu = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    menu.menuPrefix = "infoplus_command_menu_" + Math.round(Math.random() * 9000 + 1000) + "_";

    menu.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var li = document.createElement("li"),
                $li = $(li),
                a = document.createElement("a"),
                $a = $(a),
                ul = document.createElement("ul"),
                $ul = $(ul);

            $li.addClass("command_menu btn-group hide").attr("id", "command_menu");
            $a.addClass("command_button_content dropdown-toggle command_button_all")
                .attr("href", "#").attr("data-toggle", "dropdown")
                .html($$.lt("command.all") + "... <span class=\"caret\"></span>");
            $ul.addClass("dropdown-menu").attr("id", "command_menu_dropdown");
            $li.append(a).append(ul);
            return li;
        },

        putActionInfo: function (element, action) {
            if (action == null) return;
            $(element).data("actionId", action.id)
                .data("code", action.code)
                .data("skipValidation", !!action.skipValidation)
                .data("remarkRequired", !!action.remarkRequired)
                .data("remarkRequiredTip", $IU.trimString(action.remarkRequiredTip || '') === '' ? $$.lt("submit.mustInputRemark2") : action.remarkRequiredTip)
                .data("actionPrintable", !!action.printable)
                .data("lastRemark", "")
                .data("description", action.description || "")
                .data("skipMessage", action.skipMessage);
        },

        //新增菜单项，此方法不从BaseComponent继承，需要单独实现
        addMenuItem: function (options) {
            var li = document.createElement("li");
            var button = document.createElement("a");
            button.innerHTML = options.text;
            button.setAttribute("title", options.title);
            button.id = button.name = menu.menuPrefix + options.name;
            li.appendChild(button);
            $(button).click(options.onClick);
            $(this.getElement()).children("ul").prepend(li);
            this.putActionInfo(button, options.action);
        }

    });

    define("InfoPlus.Render.CommandMenu", menu);

})(window);

/**
 * 命令工具栏
 * @Author yech
 * @Since 2016/12/20
 */
(function (window, undefined) {
    /**
     * @param options 格式               //创建参数
     * ｛
     *
     *  ｝
     */
    var commandBar = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    commandBar.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {

        }


    });

    define("InfoPlus.Render.CommandBar", commandBar);

})(window);

/**
 * 命令栏帮助
 * @Author yech
 * @Since 2017/03/24
 */
(function (window, undefined) {
    /**
     * @param options 格式                            //创建参数
     * ｛
     *      content:{string}                         //内容
     *      position:{string}["left","right","top"]  //位置
     *      color:{string}                           //前景色
     *      backgroundColor{string}                 //背景色
     *      showDismiss{boolean}                    //是否显示我知道了关闭链接
     *      dismissType{string}                     //记住不再显示我知道了这个链接的cookie名字，当这个选项有值时自动认为showDismiss为true
     *      autoWidth{boolean}                      //自动宽度
     *  ｝
     */
    var helper = function (options) {
        if (options.dismissType != null) {
            options.showDismiss = true;
        }
        InfoPlus.Theme.BaseComponent.call(this, options);
    };


    var adjustTop = function ($div, position) {

        var show = function (top, delay) {
            setTimeout(function () {
                $div.show();
                $div.css("top", top + "px");
            }, delay != null ? delay : 0);
        };
        var $commandBar = $div.parent("#form_command_bar");
        var totalHeight = ($commandBar.length > 0 ? $commandBar.height() : 0) + 2,
            margin = 4,
            $prevs = $div.prevAll(".commandBar_helper." + position);
        if ($prevs.length === 0) {
            show(totalHeight);
        } else {
            var ready = true;
            $prevs.each(function () {
                var height = $(this).height();
                if (height === 0) {
                    ready = false;
                }
                totalHeight += ($(this).outerHeight() + margin);
            });
            if (ready === true) {
                show(totalHeight, $prevs.length * 500);
            } else {
                setTimeout(function () {
                    adjustTop($div, position);
                }, 100);
            }
        }

    };

    helper.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var options = this.options;
            if (options.showDismiss === true) {
                if (options.dismissType != null) {
                    if ($IU.cookie.getCookie("noTip_" + options.dismissType) === "true") {
                        return null;
                    }
                }
            }

            var instance = this,
                div = document.createElement("div"),
                $div = $(div);
            if (options.content != null) {
                $div.append(options.content).addClass("commandBar_helper round-corner z-depth-1");
                if (options.position != null) {
                    $div.addClass(options.position);
                }
            }

            if (options.showDismiss === true) {
                //如果发现content已经存在linkDiv,那么就在这个linkDiv上显示dismiss
                var linkDiv = ($(options.content).find(".helper_link_div").length === 0 ? document.createElement("div") : $(options.content).find(".helper_link_div")[0]),
                    $linkDiv = $(linkDiv);
                var linkClose = document.createElement("a");
                $(linkClose).attr("href", "#").text($$.lt("common.dismiss"));
                $linkDiv.append(linkClose).css("text-align", "right");
                $div.append(linkDiv);

                $(linkClose).click(function () {
                    instance.hide();
                    if (options.dismissType != null) {
                        var checkbox = $(this).data("checkbox");
                        if (checkbox != null && checkbox.checked) {
                            $IU.cookie.setCookie("noTip_" + options.dismissType, true, 9999);
                        }
                    }
                    return false;
                });

                if (options.dismissType != null) {
                    var label = document.createElement("label");
                    var input = document.createElement("input");
                    input.type = "checkbox";
                    var textNode = document.createTextNode($$.lt("tip.noMoreTip"));
                    $(input).addClass("commandBar_helper_noMoreTipCheck");
                    $(label).append(input);
                    $(label).append(textNode);
                    $linkDiv.append(label);
                    $(linkClose).data("checkbox", input);
                }

            }

            if (options.position != null) {
                setTimeout(function () {
                    adjustTop($div, options.position);
                }, 500);
            }

            if (options.color != null) {
                $div.css("color", options.color);
            }

            if (options.backgroundColor != null) {
                $div.css("background-color", options.backgroundColor);
            }

            if (options.autoWidth === true) {
                var wrapDiv = document.createElement("div");
                $(wrapDiv).addClass("commandBar_helper_wrapDiv").append(div);
                $div.css("width", options.width).addClass("autoWidth");

                $div.hide();
                return wrapDiv;
            }
            $div.hide();
            return div;
        },

        hide: function (hideAtOnce) {
            var $element = $(this.element);
            if (this.options.position === "top") {
                if (hideAtOnce === true) {
                    $element.remove();
                } else {
                    var $transitionElement = $element;
                    if ($element.children(".commandBar_helper").length > 0) {
                        $transitionElement = $element.children(".commandBar_helper");
                    }
                    var transitionEventName = $IU.getTransitionEndEventName();
                    if (transitionEventName != null) {
                        if (parseInt($transitionElement.css("top"), 10) === 0) {
                            $transitionElement.css("top", "-" + ($transitionElement.outerHeight() + 10) + "px");
                        } else {
                            $transitionElement.css("top", "");
                            $transitionElement.removeClass("show");
                        }
                        $transitionElement.one(transitionEventName, function () {
                            $element.remove();
                        });
                    } else {
                        $element.remove();
                    }
                }
            } else {
                var margin = 4,
                    height = $element.outerHeight() + margin,
                    $nexts = $element.nextAll(".commandBar_helper." + this.options.position);
                if (hideAtOnce === true) {
                    $element.remove();
                    $nexts.each(function () {
                        $(this).css("top", parseInt($(this).css("top"), 0) - height);
                    });
                } else {
                    $element.hide("fade", function () {
                        $element.remove();
                        $nexts.each(function () {
                            $(this).css("top", parseInt($(this).css("top"), 0) - height);
                        });
                    });
                }
            }
        },

        show: function (inBody) {
            var $element = $(this.element);
            if ($element.hasClass("commandBar_helper_wrapDiv")) {
                if (inBody) {
                    $element.children(".commandBar_helper").addClass("show").css("z-index", "0").css("top", "0");
                } else {
                    $element.children(".commandBar_helper").addClass("show");
                }
            } else {
                if (inBody) {
                    $element.addClass("show").css("z-index", "0").css("top", "0");
                } else {
                    $element.addClass("show");
                }
            }
            var instance = this;
            if (this.options.autoClose === true) {
                setTimeout(function () {
                    instance.hide();
                }, 2000);
            }
        }


    });

    define("InfoPlus.Render.CommandBarHelper", helper);

})(window);

/**
 * 标题栏
 * @Author yech
 * @Since 2016/12/20
 */
(function (window, undefined) {
    /**
     * @param options 格式               //创建参数
     * ｛
     *
     *  ｝
     */
    var titleBar = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    titleBar.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {

        }


    });

    define("InfoPlus.Render.TitleBar", titleBar);

})(window);

/**
 * 工具栏的滚动提示(当滚动到表单最下方时候出现)
 * @Author yech
 * @Since 2016/12/29
 */
(function (window, undefined) {
    /**
     * @param options 格式               //创建参数
     * ｛
     *      toolbarId:{string}          //工具栏id
     *      text:{string}               //提示文字
     *      left:{boolean}              //是否在工具栏左侧,非左即右
     *  ｝
     */
    var scrollTip = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    scrollTip.eventRegistered = false;
    scrollTip.lastScrollTop = 0;

    scrollTip.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var options = this.options;
            var span = document.createElement("span"),
                $span = $(span);
            $span.addClass("alpha40 scroll_tip").addClass(options.left ? "left" : "right").text(options.text).hide();
            return span;
        },

        initEvents: function () {
            if (!scrollTip.eventRegistered) {
                scrollTip.eventRegistered = true;

                var $toolbar = $("#" + this.options.toolbarId);

                var hideTip = function () {
                    $(".scroll_tip").filter(":visible").fadeOut(500);
                };

                $(window).scroll(function () {
                    var scrollTop = $(document).scrollTop();

                    //向下滚动到底端，出现工具栏的TIP
                    if (scrollTop > scrollTip.lastScrollTop) {
                        if ($(document).height() - ($(window).height() + scrollTop) < 10) {
                            $(".scroll_tip.left").not(':visible').each(function () {
                                if ($(this).parent().is(":visible")) {
                                    $(this).show();
                                }
                            });
                            $(".scroll_tip.right").not(':visible').each(function () {
                                if (!$(this).prev().hasClass('disabled')) {
                                    $(this).show();
                                }
                            });
                            setTimeout(hideTip, 3000);
                        }
                    }

                    scrollTip.lastScrollTop = scrollTop;
                });

                $toolbar.on("mouseenter", "li.command_button,li.command_menu", function () {
                    $(".scroll_tip.left").filter(":visible").fadeOut(500);
                });

                $toolbar.on("mouseenter", "li.tool_button", function () {
                    $(".scroll_tip.right").filter(":visible").fadeOut(500);
                });

            }
        }


    });

    define("InfoPlus.Render.ScrollTip", scrollTip);

})(window);

/**
 * 工具按钮
 * @Author yech
 * @Since 2017/03/30
 */
(function (window, undefined) {
    /**
     * @param options 格式            //创建参数
     * ｛
     *      workflowName:{string}           //流程名称
     *      department:{string}             //部门
     *      contact:{string}                //联系方式
     *      feedbackUrl:{string}            //反馈地址
     *      entrustUrl:{string}             //委托地址
     *      instructionUrl:{string}         //填表说明地址
     *  ｝
     */
    var floatTool = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    floatTool.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        //在委托，反馈url上添加四个参数
        getUrl: function (url) {

            var stepId = $$.params.formStepId == null ? -1 : $$.params.formStepId;
            url += ("?stepId=" + stepId);
            if ($$.params.formEntryId != null) {
                url += ("&entryId=" + $$.params.formEntryId);
            }
            if ($$.params.workflowId != null) {
                url += ("&workflowId=" + $$.params.workflowId);
            }

            if ($$.params.release != null) {
                url += ("&workflowRelease=" + $$.params.release);
            }
            return url;
        },

        createContactContent: function () {
            var options = this.options;
            var contentDiv = document.createElement("div"),
                titleDiv = document.createElement("div"),
                iconSpan = document.createElement("span"),
                i = document.createElement("i"),
                titleSpan = document.createElement("span");
            $(i).addClass("i-icon-assignment");
            $(iconSpan).addClass("iconSpan").append(i);
            $(titleSpan).addClass("titleSpan").text(options.workflowName);
            $(titleDiv).append(iconSpan).append(titleSpan).addClass("contactTitle");

            if ($$.params.formEntryId != null) {
                var entryIdSpan = document.createElement("span");
                $(entryIdSpan).text($$.lt("workflow.workflowNo") + "：" + $$.params.formEntryIdDisplay).addClass("entrySpan");
                $(titleDiv).append(entryIdSpan);
            }

            var deptContactDiv = document.createElement("div"),
                departmentDiv = document.createElement("div"),
                contactDiv = document.createElement("div");
            $(departmentDiv).text($$.lt("workflow.department") + "：" + options.department).addClass("department");
            $(contactDiv).text($$.lt("workflow.contact") + "：" + options.contact).addClass("contactStyle");
            $(deptContactDiv).append(departmentDiv).append(contactDiv).addClass("contactContact");

            $(contentDiv).append(titleDiv).append(deptContactDiv).addClass("contactContent");

            if (options.feedbackUrl != null || options.instructionUrl != null) {
                var feedbackDiv = document.createElement("div"),
                    $feedbackDiv = $(feedbackDiv);

                if (options.instructionUrl != null) {
                    var instructionLink = document.createElement("a"),
                        $instructionLink = $(instructionLink);
                    $instructionLink.text($$.lt("common.instruction")).click(function () {
                        if (!$$.MOBILE) {
                            var $titleHolder = $("#title_holder"),
                                titleHeight = $titleHolder.height(),
                                commandHeight = $("#command_holder").height(),
                                titleTop = parseInt($titleHolder.parent().css("top"), 10),
                                titleCommandHeight = titleHeight + commandHeight + (isNaN(titleTop) ? 0 : titleTop),//如果标题栏滚动后隐藏，titleTop会是一个负数
                                suggestHeight = $(window).height() - titleCommandHeight - 40 - 48 - 4 - 20;//40是dialog的title高度，48是dialog_body的padding,4是iframe的border,20是留白高度，由于Dialog还没创建显示，所以无法动态计算，这里只能写这些固定值，如果未来改变CSS，需要这里改动这些数字
                            $IU.iframeBox(options.instructionUrl, $$.lt("common.instruction"), true, false, $(window).width(), suggestHeight);
                        } else {
                            var page = new InfoPlus.Render.Mobile.Page({
                                title: $$.lt("common.instruction"),
                                uri: options.instructionUrl
                            });
                            page.show();
                        }
                    });
                    $feedbackDiv.append($instructionLink);
                }

                if (options.feedbackUrl != null) {
                    var feedbackLink = document.createElement("a"),
                        $feedbackLink = $(feedbackLink);
                    $feedbackLink.text($$.lt("workflow.support")).attr("target", "_blank").attr("href", this.getUrl(options.feedbackUrl));
                    $feedbackDiv.append($feedbackLink);
                }

                $feedbackDiv.addClass("feedback");
                $(contentDiv).append(feedbackDiv);
            }


            var contactContentDiv = document.createElement("div");
            $(contactContentDiv).addClass("contactContentDiv round-corner z-depth-1").append(contentDiv);
            //之所以要外面包一层，是为了使鼠标离开图标时候并进入这个联系窗口层之前，不会因为失去hover而变得不可见
            var wrapDiv = document.createElement("div");
            $(wrapDiv).append(contactContentDiv).addClass("contactWrapDiv");

            return wrapDiv;


        },

        render: function () {
            var options = this.options;

            var div = document.createElement("div"),
                $div = $(div),
                toolDiv = document.createElement("div"),
                $toolDiv = $(toolDiv),
                contactDiv = document.createElement("div"),
                $contactDiv = $(contactDiv),
                scrollDiv = document.createElement("div"),
                $scrollDiv = $(scrollDiv);

            var i = document.createElement("i");
            $(i).addClass("i-icon-feedback");
            $contactDiv.append(i).addClass("contact button z-depth-1");

            $contactDiv.append(this.createContactContent());
            var hoverDiv = document.createElement("div");
            $(hoverDiv).addClass("hoverDiv").append($('<table border="0" cellpadding="0" cellspacing="0"><tr><td>' + $$.lt("workflow.help") + '</td></tr></table>'));
            $contactDiv.append(hoverDiv);

            $toolDiv.append(contactDiv);

            $scrollDiv.attr("id", "toTop").addClass("button z-depth-1");
            i = document.createElement("i");
            $(i).addClass("i-icon-publish");
            $scrollDiv.append(i).css("display", "none");

            hoverDiv = document.createElement("div");
            $(hoverDiv).addClass("hoverDiv").text($$.lt("workflow.backToTop"));
            $scrollDiv.append(hoverDiv);

            this.toTopButton = $scrollDiv;
            $div.attr("id", "float_tool").append(toolDiv);


            if (options.entrustUrl != null) {
                var entrustDiv = document.createElement("div"),
                    $entrustDiv = $(entrustDiv),
                    link = document.createElement("a"),
                    $link = $(link);

                i = document.createElement("i");
                $(i).addClass("i-icon-user-secret");


                $entrustDiv.append(i).addClass("entrust button z-depth-1");

                hoverDiv = document.createElement("div");
                $(hoverDiv).addClass("hoverDiv").text($$.lt("workflow.entrust"));


                $link.append(hoverDiv).attr("target", "_blank").attr("href", this.getUrl(options.entrustUrl));
                $link.click(function () {
                    if ($link.data("confirmed") === true) {
                        $link.data("confirmed", false);
                        return true;
                    }
                    $IU.confirmBox($$.lt("workflow.confirmEntrust"), $$.lt("common.confirm"), $$.lt("common.ok"), 300, function () {
                        $link.data("confirmed", true);
                        $IU.fireClick(link);
                    });
                    return false;
                });
                $entrustDiv.append(link);

                $toolDiv.append(entrustDiv);
            }

            $div.append(scrollDiv).addClass("floatTool");


            return div;
        },

        initEvents: function () {

            var $toTop = this.toTopButton;

            $toTop.click(function () {
                $('html, body').animate({scrollTop: "0px"}, 400);
                return false;
            });

            $(window).scroll(function () {
                //滚动条滚动超过半屏就出现回到顶端
                var scrollTop = $(window).scrollTop() || document.documentElement.scrollTop;
                if (scrollTop >= $(window).height() / 2) {
                    $toTop.show();
                } else {
                    $toTop.hide();
                }
            });


        }

    });

    define("InfoPlus.Render.FloatTool", floatTool);

})(window);

/**
 * view标签
 * @Author yech
 * @Since 2017/04/06
 */
(function (window, undefined) {
    /**
     * @param options 格式                //创建参数
     * ｛
     *      view{View}                   //view对象
     *  ｝
     */
    var viewLabel = function (options) {
        this.view = options.view;
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    viewLabel.eventRegistered = false;
    viewLabel.initLabelFullHeight = false;

    // 非常想用const，可惜不是es6
    var LABEL_PADDING = 5;
    // ie8,ie9不能用剪切css，否则有bug，不使用剪切，则mouseenter,mouseleave无法使用动画，否则动画时会从view左侧露出一块
    var FULL_EFFECT = !(navigator.appName === "Microsoft Internet Explorer" &&
        parseInt(navigator.appVersion.split(";")[1].replace(/[ ]/g, "").replace("MSIE", "")) <= 9);

    var getCurrentLeft = function () {
        var left = 100000;
        $(".infoplus_view:visible").each(function () {
            var $view = $(this);
            if ($view.offset().left < left) {
                left = $view.offset().left;
            }
        });
        return left - 2;
    };

    // 刷新重排标签
    viewLabel.refreshLabels = function () {

        var getAllViewLabels = function () {
            var $labels = $$.params.holder.form.find(".infoplus_view_label");
            //先按照view.index排序
            $labels.sort(function (a, b) {
                return $(a).data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).index - $(b).data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).index;
            });
            return $labels;
        };

        var initFullHeight = function ($labels) {
            for (var i = 0; i < $labels.length; i++) {
                var $label = $($labels[i]);
                if ($label.is(":visible")) {
                    // 每个标签第一次可见的时候设置全高
                    if ($label.data("fullHeight") === undefined) {
                        $label.data("fullHeight", $label.outerHeight());
                    } else {
                        // 如果发现标签变高了，保留高的尺寸
                        if ($label.outerHeight() > $label.data("fullHeight")) {
                            $label.data("fullHeight", $label.outerHeight());
                        }
                    }
                }
            }
        };


        var setFixPosition = function ($label, top, position) {
            $label.hide();
            var $fixedLabel = getFixedLabel($label);
            if (top !== parseFloat($fixedLabel.css("top"))) {
                $fixedLabel.css("top", top + "px");
            }
            $fixedLabel.data("position", position);
            if (position === "top") {
                $fixedLabel.removeClass("bottom").addClass("top");
            } else {
                $fixedLabel.removeClass("top").addClass("bottom");
            }

            $fixedLabel.show();
        };

        var setFullText = function ($fixedLabel) {
            $fixedLabel.text($fixedLabel.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).name).data("isAbstract", false).removeClass("isAbstract");
        };

        var setAbstractText = function ($fixedLabel) {
            if (!$fixedLabel.data("abstractExpanded")) {
                $fixedLabel.text($fixedLabel.data("abstractName")).data("isAbstract", true).addClass("isAbstract");
            }
        };

        var getFixedLabel = function ($label) {
            return $label.data("fixedLabel");
        };

        var getTopFixTop = function (index) {
            var $commandBar = $("#command_holder"),
                fixTop = ($commandBar.length > 0 ? $commandBar.height() + 4 : 0);

            for (var j = 0; j < index; j++) {
                var $label = $($labels[j]),
                    $view = $($label.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element);
                if ($view.is(":visible")) {
                    // 如果view可见，那么增加相应label的高度（绝对定位或者fix定位的标签）
                    if ($label.is(":visible")) {
                        fixTop += ($label.outerHeight() + LABEL_PADDING);
                    } else {
                        fixTop += (getFixedLabel($label).outerHeight() + LABEL_PADDING);
                    }
                }
            }
            return fixTop;
        };

        var getBottomFixTop = function (index) {
            var fixTop = $(window).height() - getFixedLabel($($labels[index])).outerHeight();
            for (var j = $labels.length - 1; j > index; j--) {
                var $fixedLabel = getFixedLabel($($labels[j])),
                    $view = $($fixedLabel.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element);
                if ($view.is(":visible")) {
                    fixTop -= ($fixedLabel.outerHeight() + LABEL_PADDING);
                }
            }
            return fixTop;
        };

        var setAllLabelVisibility = function ($labels) {
            $labels.each(function () {
                var $label = $(this),
                    $fixedLabel = getFixedLabel($label),
                    $view = $($label.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element);
                if ($view.is(":visible")) {
                    if ($label.is(":visible")) {
                        $fixedLabel.hide();
                    }
                } else {
                    $label.show();
                    $fixedLabel.hide();
                }
            });
        };

        // 调整所有fix定位的标签的left
        var setAllFixLeft = function ($labels, left) {
            for (var i = 0; i < $labels.length; i++) {
                var $fixedLabel = getFixedLabel($($labels[i])),
                    $view = $($fixedLabel.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element);
                if ($view.is(":visible")) {
                    if ($fixedLabel.css("position") === "fixed" && !$fixedLabel.data("abstractExpanded")) {
                        $fixedLabel.css("left", (left - $fixedLabel.outerWidth() + ($fixedLabel.hasClass("infoplus_view_hide") || $fixedLabel.hasClass("isAbstract") ? 2 : 0) + "px"));
                    }
                }
            }
        };

        // 设置top_background，bottom_background两个fixed定位层位置，这两个层位于fix定位标签的下面(堆叠z-index)，位于view里绝对定位的标签的上面
        // 所以这两个层可以在上下滚动时，当绝对定位标签和fix定位标签位置有叠加时(滚动后还来不及触发scroll重刷标签定位和位置)，挡住绝对定位的标签
        var setFixedLabelContainerPosition = function () {
            var $fixedLabelContainer = $$.params.holder.render.children(".label_container"),
                $topBackground = $fixedLabelContainer.children(".top_background"),
                $bottomBackground = $fixedLabelContainer.children(".bottom_background");
            // 添加底色便于调试观察
            // $topBackground.css("background-color", "red");
            // $bottomBackground.css("background-color", "blue");

            var setContainerPosition = function ($container, $labels, info) {
                if ($labels.length > 0) {
                    // 找到最高、最低位置
                    var top = 0, bottom = 0, left = 0, width = 0;
                    $labels.each(function () {
                        var topPosition = parseFloat($(this).css("top")),
                            leftPosition = parseFloat($(this).css("left")),
                            bottomPosition = topPosition + $(this).outerHeight();
                        if (top === 0 || topPosition < top) {
                            top = topPosition;
                        }
                        if (left === 0 || leftPosition < left) {
                            left = leftPosition;
                            width = $(this).outerWidth();
                        }
                        if (bottomPosition > bottom) {
                            bottom = bottomPosition;
                        }
                    });
                    $container.css("left", left + "px").css("top", (top - LABEL_PADDING) + "px")
                        .css("width", width + "px").css("height", (bottom - top + 2 * LABEL_PADDING) + "px");
                } else {
                    $container.css({"top": "0", "left": "0", "width": "0", "height": "0"});
                }
            };

            setContainerPosition($topBackground, $fixedLabelContainer.children(".infoplus_view_label.top:visible"), "top");
            setContainerPosition($bottomBackground, $fixedLabelContainer.children(".infoplus_view_label.bottom:visible"), "bottom");

            var topBackgroundTop = parseFloat($topBackground.css("top")),
                topBackgroundHeight = parseFloat($topBackground.css("height")),
                bottomBackgroundTop = parseFloat($bottomBackground.css("top")),
                bottomBackgroundHeight = parseFloat($bottomBackground.css("height")),
                deltaTop;

            if (bottomBackgroundHeight > 0) {
                if (topBackgroundHeight === 0) {
                    // 顶部fix定位背景层高度为0，说明没有顶部定位的，找第一个可见的view里面绝对定位的标签，看其位置是否超过了底部fix定位层背景的顶部，超过了就调整所有底部fix定位元素的top
                    var $firstLabel = $$.params.holder.form.find(".infoplus_view_label:visible").first();
                    if ($firstLabel.length > 0) {
                        if ($firstLabel.offset().top + $firstLabel.outerHeight() > bottomBackgroundTop) {
                            deltaTop = bottomBackgroundTop - ($firstLabel.offset().top + $firstLabel.outerHeight());
                        }
                    }
                } else {
                    // 顶部fix定位的元素的底部位置已经超过了底部fix定位的顶部位置，调整底部fix定位元素的top
                    if (topBackgroundTop + topBackgroundHeight - LABEL_PADDING > bottomBackgroundTop) {
                        deltaTop = bottomBackgroundTop - (topBackgroundTop + topBackgroundHeight - LABEL_PADDING);

                    }
                }
                if (deltaTop !== undefined) {
                    $fixedLabelContainer.children(".bottom").each(function () {
                        var $label = $(this);
                        $label.css("top", (parseFloat($label.css("top")) - deltaTop) + "px");
                    });
                    $bottomBackground.css("top", (parseFloat($bottomBackground.css("top")) - deltaTop) + "px");
                }
            }

        };

        // 查找下一个可见的底部fix定位的标签，如果没有
        var findNextVisibleBottomFixLabel = function ($labels, index) {
            var currentIndex = index + 1;
            while (currentIndex < $labels.length) {
                var $nextLabel = $($labels[currentIndex]),
                    $nextFixedLabel = getFixedLabel($nextLabel);
                // 如果下一个可见的是绝对定位的标签，返回null，让调用的地方直接跳出循环
                if ($nextLabel.is(":visible")) {
                    return null;
                }
                if ($nextFixedLabel.is(":visible")) {
                    return $nextFixedLabel;
                }
                currentIndex++;
            }
            return null;
        };

        // 根据view是否显示在当前屏幕决定fix定位标签底色，在屏幕内白色底色，屏幕外灰色底色
        var setFixedLabelClass = function ($view, $fixedLabel, windowTop, windowHeight, toolbarHeight) {
            var viewTop = $IU.getElementPosition($view[0]).top;
            if (($view.outerHeight() + viewTop < windowTop + toolbarHeight) || viewTop > windowTop + windowHeight) {
                $fixedLabel.addClass("infoplus_view_hide");
            } else {
                $fixedLabel.removeClass("infoplus_view_hide");
            }
        };

        var $labels = getAllViewLabels();
        if ($labels.length === 0) {
            return;
        }

        initFullHeight($labels);

        //如果有多个view，滚动窗口时候调整标签位置和大小
        var $commandBar = $("#command_holder"),
            toolbarHeight = ($commandBar.length > 0 ? $commandBar.height() + 4 : 0),
            outOfWindowIndex = -1,
            // || document.documentElement.scrollTop是为了避免ie8下的bug
            windowTop = $(window).scrollTop() || document.documentElement.scrollTop,
            windowHeight = $(window).height(),
            left = getCurrentLeft(),
            lastTopFixPositionIndex;

        for (var i = 0; i < $labels.length; i++) {
            var $label = $($labels[i]),
                $view = $($label.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element),
                fixTop = getTopFixTop(i),
                // 用getElementPosition而不采用$view.offset().top是为了避免ie8下的错误
                viewTop = $IU.getElementPosition($view[0]).top,
                labelHeight = $label.outerHeight();

            if (!$view.is(":visible")) {
                continue;
            }

            //先计算是否fix定位
            //在屏幕上方外面，或者在内部但高度比叠起来的标签最下端要高（在上面）
            if (viewTop < windowTop + fixTop) {
                // 以下代码设置节点顶部fix定位
                // 找到最后一个用顶部fix定位的index
                if (lastTopFixPositionIndex == null || lastTopFixPositionIndex < i) {
                    lastTopFixPositionIndex = i;
                }
                var $fixedLabel = getFixedLabel($label);
                setFixPosition($label, fixTop, "top");
                var labelTop = windowTop + fixTop;
                // 显示不下了就缩写
                if ($label.data("fullHeight") + labelTop > $view.outerHeight() + viewTop) {
                    setAbstractText($fixedLabel);
                } else {
                    setFullText($fixedLabel);
                }
                setFixedLabelClass($view, $fixedLabel, windowTop, windowHeight, toolbarHeight);
            } else {
                //屏幕内
                if (viewTop + $label.data("fullHeight") < windowTop + windowHeight) {
                    // 这部分标签可能是view内绝对定位（标记为逻辑A），也可能因为计算下来底部超过下一个可见标签的顶部而底端fix定位，下面会进行计算
                    $label.show();
                } else {
                    //该标签的位置（该标签所在view的顶部位置）在屏幕下方外面，将这个index记下来，下面会将所有index大于等于这个index的标签都沉到底端fix定位
                    outOfWindowIndex = i;
                    break;
                }
            }
        }

        if (outOfWindowIndex !== -1) {
            // 如果没有顶部fix定位的，那么循环终点就是1，有顶部fix定位的，循环终点就是lastTopFixPositionIndex+1
            // 内含逻辑是，第一个标签不能底部fix定位，要么在view的div里绝对定位，要么是顶部fix定位
            if (lastTopFixPositionIndex == null) {
                lastTopFixPositionIndex = 0;
            }

            for (var index = $labels.length - 1; index > lastTopFixPositionIndex; index--) {

                $label = $($labels[index]);
                $view = $($label.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element);
                $fixedLabel = getFixedLabel($label);

                if (index >= outOfWindowIndex) {
                    // 大于等于outOfWindowIndex全部底部fix定位
                    if ($view.is(":visible")) {
                        setAbstractText($fixedLabel);
                        setFixPosition($label, getBottomFixTop(index), "bottom");
                        setFixedLabelClass($view, $fixedLabel, windowTop, windowHeight, toolbarHeight);
                    }
                } else {
                    // 调整所有index小于outOfWindowIndex的屏幕内的（逻辑A）可见标签（已经顶部fix定位的元素就不用判断是否超出了下面一个标签的顶部了）
                    // 如果发现计算下来标签的底部（加了一个padding间隔）超过了下一个标签的顶部，就底部fix定位
                    if ($view.is(":visible")) {
                        if (index !== $labels.length - 1 && index !== 0) {
                            var $nextLabel = findNextVisibleBottomFixLabel($labels, index);
                            // 如果找不到或者找到的是固定定位的标签，直接跳出循环，不用再计算这个以及后面的标签是否底部超过了下一个标签的顶部
                            if ($nextLabel == null) {
                                break;
                            }
                            if ($label.offset().top + $label.outerHeight() + LABEL_PADDING > $nextLabel.offset().top) {
                                setAbstractText($fixedLabel);
                                setFixPosition($label, getBottomFixTop(index), "bottom");
                                // 这部分标签所在view都在屏幕内，所以显示白色底色
                                $fixedLabel.removeClass("infoplus_view_hide");
                            } else {
                                // 标签底部没超过下一个底部fix定位标签的顶部，那么也就不用再循环了
                                break;
                            }
                        }
                    }
                }
            }
        }

        setAllLabelVisibility($labels);
        setAllFixLeft($labels, left);
        setFixedLabelContainerPosition();
    };

    var createLabelContainer = function () {
        var container = document.createElement("div");
        $$.params.holder.render.append(container);
        var $fixedLabelContainer = $(container);
        $fixedLabelContainer.addClass("label_container");
        var backgroundColor = $("#renderContent_holder").css("background-color");
        var topContainer = document.createElement("div"),
            bottomContainer = document.createElement("div"),
            $topContainer = $(topContainer),
            $bottomContainer = $(bottomContainer);
        $topContainer.addClass("top_background").css("background-color", backgroundColor);
        $bottomContainer.addClass("bottom_background").css("background-color", backgroundColor);
        $fixedLabelContainer.append(topContainer).append(bottomContainer);

        // ie8 ie9 用这个剪裁都会有bug，放弃clip方案
        if (FULL_EFFECT) {
            // 设置top:-10000px是因为发现ie以及edge中设置0的时候第一个fix定位的标签会不能按，看上去剪裁区域计算有误，别的浏览器设置top:0没有问题
            $fixedLabelContainer.css("clip", "rect(-10000px, 298px, auto, 0px)");
        }

        return $fixedLabelContainer;
    };

    viewLabel.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {

            var view = this.view;

            var labelDiv = document.createElement("div"),
                $labelDiv = $(labelDiv);
            $labelDiv.attr("id", view.prefix + "label_" + view.index).text(view.name)
                .addClass("infoplus_view_label round-corner z-depth-0")
                .data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT, view).data("label", this);

            //产生缩写标签
            var name = view.name,
                charReg = new RegExp("[^\x00-\xff]"),
                abstractName = '';
            if (charReg.test(name.charAt(0))) {
                abstractName = name.charAt(0);
            } else {
                for (var charIndex = 0, nameLen = name.length; charIndex < nameLen; charIndex++) {
                    if (!charReg.test(name.charAt(charIndex))) {
                        abstractName += name.charAt(charIndex);
                    } else {
                        break;
                    }
                }
            }

            if (abstractName.length > 3) {
                abstractName = abstractName.substr(0, 3);
            }

            $(labelDiv).data("abstractName", abstractName);

            // 如果发现fix定位标签容器还没创建，就创建容器
            if (viewLabel.$fixedLabelContainer === undefined) {
                viewLabel.$fixedLabelContainer = createLabelContainer();
            }
            // 将当前标签clone一份放到fix定位标签容器中
            viewLabel.$fixedLabelContainer.append(this.clone(labelDiv));
            return labelDiv;
        },

        clone: function (labelDiv) {
            var view = this.view,
                $labelDiv = $(labelDiv),
                fixedLabelDiv = document.createElement("div"),
                $fixedLabelDiv = $(fixedLabelDiv);

            $fixedLabelDiv.attr("id", view.prefix + "fixed_label_" + view.index).text(view.name)
                .addClass("infoplus_view_label round-corner z-depth-0")
                .data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT, view).data("label", this)
                .data("abstractName", $labelDiv.data("abstractName"));
            $labelDiv.data("fixedLabel", $fixedLabelDiv);
            return fixedLabelDiv;
        },

        initEvents: function () {
            var getAnimateLeft = function ($label, left, width) {
                return left - width + ($label.hasClass("infoplus_view_hide") || $label.hasClass("isAbstract") ? 2 : 0);
            };

            var labelMouseEnter = function () {
                var $label = $(this);
                if (!$label.data("isAbstract")) return;
                $label.stop(true, true);
                var oldLeft = getCurrentLeft();
                $label.text($label.data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).name);
                $label.addClass("horz");
                var newWidth = $label.outerWidth();
                var newLeft = oldLeft - newWidth;
                if (FULL_EFFECT) {
                    $label.animate({
                        left: newLeft + "px"
                    });
                } else {
                    $label.css("left", newLeft + "px");
                }
                $label.data("abstractExpanded", true);
            };

            var labelMouseLeave = function () {
                var $label = $(this);
                if (!$label.data("abstractExpanded")) return;
                $label.stop(true, true);
                var left = getCurrentLeft();
                $label.removeClass("horz");
                var width = $label.outerWidth();
                $label.addClass("horz");
                //还是显示缩写的动画还原
                if ($label.data("isAbstract")) {
                    if (FULL_EFFECT) {
                        $label.animate({
                            left: getAnimateLeft($label, left, width) + "px"
                        }, function () {
                            $label.removeClass("horz");
                            $label.text($label.data("abstractName"));
                            $label.removeData("abstractExpanded");
                        });
                    } else {
                        $label.css("left", getAnimateLeft($label, left, width) + "px");
                        $label.removeClass("horz");
                        $label.text($label.data("abstractName"));
                        $label.removeData("abstractExpanded");
                    }
                } else {
                    //已经显示全文字的直接还原
                    $label.removeClass("horz");
                    //如果仍旧是fix定位的计算left,如果标签回到view的dom里面用fix定位的，直接将left样式删除
                    if ($label.css("position") === "fixed") {
                        $label.css("left", getAnimateLeft($label, left, width) + "px");
                    } else {
                        $label.css("left", "");
                    }
                    $label.removeData("abstractExpanded");
                }
            };

            var bindMouseEvent = function () {
                unbindMouseEvent();
                $(document.body).on("mouseenter.viewLabel", ".infoplus_view_label", labelMouseEnter);
                $(document.body).on("mouseleave.viewLabel", ".infoplus_view_label", labelMouseLeave);
            };

            var unbindMouseEvent = function () {
                $(document.body).off(".viewLabel");
            };

            var scrollCount = 0;
            var onWindowScroll = function () {
                // 将所有标签横向展开都收拢
                $(".infoplus_view_label").each(function () {
                    var $label = $(this);
                    if ($label.data("abstractExpanded")) {
                        $label.stop(true, true);
                        if ($label.css("position") === "fixed") {
                            var left = getCurrentLeft();
                            $label.removeClass("horz");
                            var width = $label.outerWidth();
                            $label.css("left", getAnimateLeft($label, left, width) + "px");
                            $label.text($label.data("abstractName"));
                            $label.removeData("abstractExpanded");
                        } else {
                            $label.css("left", "");
                            $label.removeClass("horz");
                            $label.removeData("abstractExpanded");
                        }
                    }
                });

                viewLabel.refreshLabels();
            };

            var bindScrollEvent = function () {
                unbindScrollEvent();
                $(window).on("scroll.windowScroll", onWindowScroll);
            };

            var unbindScrollEvent = function () {
                $(window).off(".windowScroll");
            };

            // var isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            var onLabelClick = function () {
                //点击时候发现已经展开显示，那么重新显示缩写标签，重算标签位置
                var $label = $(this);
                if ($label.data("abstractExpanded") === true) {
                    $label.stop(true, true);
                    var left = getCurrentLeft();
                    $label.removeClass("horz");
                    var width = $label.outerWidth();
                    $label.css("left", getAnimateLeft($label, left, width) + "px");
                    $label.text($label.data("abstractName"));
                    $label.removeData("abstractExpanded");
                }

                unbindMouseEvent();
                //用$IU.getElementPosition可以避免ie8下直接用jquery的offset()方法位置不准确的问题(屏幕滚动几下就不准确了)
                $IU.scrollTo($IU.getElementPosition($(this).data(InfoPlus.Layout.View.DATA_CONTROL_OBJECT).element).top - 40, 500, function () {
                    bindMouseEvent();
                });
            };

            var bindLabelClickEvent = function () {
                $(document.body).on("click.viewLabelClick", ".infoplus_view_label", onLabelClick);
            };

            // 重新计算剪裁区域
            var setClip = function () {
                if (FULL_EFFECT) {
                    var margin = parseFloat($(".infoplus_view:visible").last().css("margin-bottom"));
                    var bottom = (viewLabel.$fixedLabelContainer.height() - margin) + "px";
                    viewLabel.$fixedLabelContainer.css("clip", "rect(-10000px, 298px, " + bottom + ", 0px)");
                }
            };

            //以下事件只注册一次
            if (!viewLabel.eventRegistered) {
                viewLabel.eventRegistered = true;
                $$.visible(function () {
                    viewLabel.refreshLabels();

                    $(window).resize(function () {
                        viewLabel.refreshLabels();
                        setClip();
                    });
                    bindScrollEvent();
                    bindMouseEvent();
                    bindLabelClickEvent();

                    // 延时一秒初始化剪裁区域，不延时$fixedLabelContainer.height()会多一些，原因不详
                    setTimeout(setClip, 1000);
                });

            }
        }
    });

    define("InfoPlus.Render.ViewLabel", viewLabel);

})(window);

/**
 * 弹出提示气泡
 * @Author yech
 * @Since 2017/06/29
 */
(function (window, undefined) {
    /**
     * @param options 格式                           //创建参数
     * ｛
     *      popper{HTMLElement}                     //弹出该tip的元素
     *      container{HTMLElement}                  //放置tip的dom元素
     *      control{control}                        //控件
     *      content{string}                         //显示的内容,html格式
     *      showCloseButton{boolean}(false)         //是否显示右上角关闭按钮,缺省false
     *      showDeleteButton{boolean}(false)        //是否显示右上角删除按钮（包括最小化按钮）,在showCloseButton情况下忽略该参数,缺省false
     *      text{string}                            //显示的文字
     *      hoverText{string}                       //hover或者点击时候显示的文字
     *      colorClass{string}                      //配色class
     *      backgroundColor{string}                 //背景色
     *      color{string}                           //前景色
     *      placement{string}                       //放置位置 top,top-right,bottom,bottom-right,right,left
     *      location{string}                        //用于定位的css，缺省是top，也可以是bottom
     *      effect{string}                          //显示效果
     *      onClose{function}                       //关闭时候的回调函数
     *      onClick{function}                       //点击时候的回调函数,该函数返回true就关闭该提示
     *      onMaximized{function}                   //最大化以后回调函数
     *      unclearable{boolean}(false)             //在clear方法中是不可清除的
     *  ｝
     */
    var tip = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };


    //这两个全局变量为的是让一个批次产生的PopTip一起显示效果
    tip.showEffectFlag = false;
    tip.effectObject = {};

    tip.DEFAULT_PRIMARY_PLACEMENT = "top";
    tip.DEFAULT_SECONDARY_PLACEMENT = "left";
    tip.DEFAULT_CONTAINER_ID = "render_holder";
    tip.MIN_MAX_WIDTH = 200;

    tip.DATA_TIP = "popTip";
    tip.DATA_TIP_CONTROL = "tipControl";            //记录这个冒这个气泡的控件
    tip.DATA_HIDE_BY_SHRINK_VIEW = "shrinkView";    //记录因为哪个view缩起来而隐藏
    tip.CLASS_TIP = "popTip";
    tip.CLASS_HIDE_FOR_SHRINK = "hideShrink";
    tip.SELECTOR_CLASS_TIP = "." + tip.CLASS_TIP;

    //清除所有气泡
    tip.clear = function (atOnce, clearAll) {
        $(".popTip").each(function () {
            var tipControl = $(this).data(tip.DATA_TIP_CONTROL);
            if (tipControl != null) {
                if (tipControl.options.unclearable !== true || clearAll === true) {
                    tipControl.close(atOnce);
                }
            }
        });
    };

    //修正所有气泡的位置
    tip.fixPosition = function (animate) {
        $(".popTip").each(function () {
            var tipControl = $(this).data(tip.DATA_TIP_CONTROL);
            if (tipControl != null) {
                tipControl.fixPosition(animate);
            }
        });
    };


    tip.showEffect = function () {
        for (var effectName in tip.effectObject) {
            if (!tip.effectObject.hasOwnProperty(effectName)) continue;
            var divs = tip.effectObject[effectName];
            for (var i = 0, len = divs.length; i < len; i++) {
                $(divs[i]).effect(effectName, {}, 150);
            }

        }
        tip.showEffectFlag = false;
        tip.effectObject = {};
    };

    tip.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        getPlacement: function () {
            var options = this.options,
                placements = this.options.placement.split("-");
            if (placements.length === 0) {
                options.primaryPlacement = tip.DEFAULT_PRIMARY_PLACEMENT;
                options.secondaryPlacement = tip.DEFAULT_SECONDARY_PLACEMENT;
                return;
            }
            options.primaryPlacement = placements[0];
            if (placements.length === 1) {
                options.secondaryPlacement = tip.DEFAULT_SECONDARY_PLACEMENT;
            } else {
                options.secondaryPlacement = placements[1];
            }
        },

        fixPosition: function (animate) {
            var $element = $(this.element);
            var changed = this.setPosition();
            if (changed && !this.isHideByShrinkView()) {
                //除非显式的说明不要求动画效果，否则就动画修改位置
                if (animate !== false) {
                    var transitionEndEventName = $$.getTransitionEndEventName();
                    if (transitionEndEventName != null) {
                        $element.addClass("fixPosition");
                        $element.one(transitionEndEventName, function () {
                            $element.removeClass("fixPosition");
                        });
                    }
                }
            }
        },

        setPosition: function (element, arrowDiv) {
            var isFix = (element == null),
                changed = false;

            var setChanged = function (cssName, newValue) {
                if (!isFix) return;
                changed = (parseInt($div.css(cssName), 10) !== newValue);
            };

            var options = this.options,
                $popper = $(options.popper),
                popperOffset = $popper.offset(),
                $container = $(options.container),
                containerOffset = $container.offset();

            //弹出元素不可见(且不是因为view被缩起来而看不见的)，那么Pop就隐藏
            if (!$popper.is(":visible") && !this.isHideByShrinkView()) {
                this.close(true);
                return;
            }

            var div = (element == null ? this.element : element),
                $div = $(div),
                $arrowDiv = (arrowDiv == null ? $(div).children(".arrow") : $(arrowDiv));

            if (options.primaryPlacement === "bottom" || options.primaryPlacement === "top") {
                if (options.secondaryPlacement === "right") {
                    $arrowDiv.css("right", "6px");
                    var right = $container.outerWidth() - (popperOffset.left - containerOffset.left + $popper.outerWidth());
                    setChanged("right", right);
                    $div.css("right", right + "px");
                } else {
                    $arrowDiv.css("left", "6px");
                    var left = popperOffset.left - containerOffset.left;
                    setChanged("left", left);
                    $div.css("left", left + "px");
                }

                if (options.placement === "bottom") {
                    if (options.backgroundColor != null) {
                        $arrowDiv.css("border-bottom-color", options.backgroundColor);
                    }
                    var top = popperOffset.top - containerOffset.top + $popper.outerHeight() + 4;
                    setChanged("top", top);
                    $div.css("top", top + "px").css("bottom", "");
                } else {
                    if (options.backgroundColor != null) {
                        $arrowDiv.css("border-top-color", options.backgroundColor);
                    }
                    if (options.location === "bottom") {
                        var bottom = $container.height() - (popperOffset.top - containerOffset.top) + 4;
                        setChanged("bottom", bottom);
                        $div.css("bottom", bottom + "px").css("margin-bottom", "0").css("top", "");
                    } else {
                        if ($div.height() === 0) {
                            $div.css("top", "-1000px");
                            var flag = setInterval(function () {
                                if ($div.height() !== 0) {
                                    top = $(options.popper).offset().top - $container.offset().top - $div.outerHeight() - 4;
                                    $div.css("top", top + "px").css("bottom", "");
                                    clearInterval(flag);
                                }
                            }, 100);
                        } else {
                            top = popperOffset.top - containerOffset.top - $div.outerHeight() - 4;
                            setChanged("top", top);
                            $div.css("top", top + "px").css("bottom", "");
                        }

                    }
                }
            }

            if (options.primaryPlacement === "left" || options.primaryPlacement === "right") {
                //暂时不实现
            }

            if (isFix) {
                return changed;
            }
        },

        showByExpandView: function () {
            $(this.element).removeClass(tip.CLASS_HIDE_FOR_SHRINK).removeData(tip.DATA_HIDE_BY_SHRINK_VIEW);
            this.setPosition();
        },

        hideByShrinkView: function (view) {
            $(this.element).addClass(tip.CLASS_HIDE_FOR_SHRINK).data(tip.DATA_HIDE_BY_SHRINK_VIEW, view);
        },

        isHideByShrinkView: function () {
            return $(this.element).hasClass(tip.CLASS_HIDE_FOR_SHRINK);
        },

        render: function () {
            var instance = this,
                options = this.options;
            if (options.popper == null || !$(options.popper).is(":visible")) return null;
            if (options.container == null) {
                //options.container = $("#" + tip.DEFAULT_CONTAINER_ID)[0];
                options.container = $$.params.renderContainer[0];
            }
            this.getPlacement();
            var $popper = $(options.popper),
                $container = $(options.container);

            var div = document.createElement("div"),
                $div = $(div),
                minI = document.createElement("i"),
                $minI = $(minI),
                arrowDiv = document.createElement("div"),
                $arrowDiv = $(arrowDiv);
            $div.addClass(tip.CLASS_TIP)
                .attr("x-placement", options.primaryPlacement);
            $minI.addClass("i-icon-more-horiz content_minimized").hide();
            if (options.content == null) {
                var divText = document.createElement("div"),
                    $divText = $(divText);
                $divText.html($IU.htmlEncode(options.text)).addClass("tipText");
                $div.append(divText);
            } else {
                var divContent = document.createElement("div"),
                    $divContent = $(divContent),
                    content = options.content;
                $divContent.addClass("popTip_content");
                if (content instanceof jQuery) {
                    content.detach().appendTo($divContent);
                    if (!content.is(":visible")) {
                        content.show();
                    }
                } else {
                    $divContent.html(content);
                }
                $div.append(divContent).addClass("content");
            }
            if (options.showCloseButton) {
                var closeI = document.createElement("i");
                $(closeI).addClass("i-icon-close2 infoplus_popTip_close")
                    .click(function () {
                        instance.close();
                    });
                $div.append(closeI).css("padding-right", "18px");
            }


            if (options.colorClass != null) {
                $div.addClass(options.colorClass);
            }
            //应该用colorClass的方式配色，这样可以应用于主题，直接设置前景背景色也支持，但不推荐
            if (options.backgroundColor != null) {
                $div.css("background-color", options.backgroundColor);
            }
            if (options.color != null) {
                $div.css("color", options.color);
            }

            $arrowDiv.addClass("arrow");

            this.setPosition(div, arrowDiv);
            $div.append(minI).append(arrowDiv);
            //$(document.body).append(div);
            $container.append(div);
            $div.data(tip.DATA_TIP_CONTROL, this);


            if (options.hoverText != null) {
                if (options.primaryPlacement === "bottom" || options.primaryPlacement === "top") {
                    var maxW = (options.secondaryPlacement === "left" ? $container.outerWidth() - parseInt($div.css("left"), 10)
                        : $container.outerWidth() - parseInt($div.css("right"), 10));
                    if (maxW > tip.MIN_MAX_WIDTH) {
                        $div.css("max-width", maxW + "px");
                    } else {
                        $div.css("max-width", tip.MIN_MAX_WIDTH + "px");
                    }
                }
            }

            //获取最大z-index，设置tip最大z-index
            var maxZindex = 0;
            $popper.parents().each(function () {
                var currentZindex = parseInt($(this).css("z-index"), 10);
                if (!isNaN(currentZindex) && currentZindex > maxZindex) {
                    maxZindex = currentZindex;
                }
            });
            if (maxZindex !== 0) {
                $div.css("z-index", maxZindex);
            }

            //批次显示效果
            if (options.effect != null) {
                if (tip.showEffectFlag === false) {
                    tip.showEffectFlag = true;
                    setTimeout(function () {
                        tip.showEffect();
                    }, 500);
                }
                var tips = tip.effectObject[options.effect];
                if (tips == null) {
                    tips = tip.effectObject[options.effect] = [];
                }
                tips.push(div);
            }

            $popper.data(tip.DATA_TIP, this).data("remark", options.text);
            return div;
        },

        close: function (atOnce) {
            $(this.options.popper).removeData(tip.DATA_TIP);
            var onClose = this.options.onClose;
            if (atOnce === true) {
                $(this.element).remove();
                if (typeof onClose === 'function') {
                    onClose();
                }
            }
            $(this.element).hide("fade", function () {
                $(this).remove();
                if (typeof onClose === 'function') {
                    onClose();
                }
            });

        },

        minimize: function (callback) {
            var instance = this,
                options = this.options,
                $element = $(this.element),
                $content = $(this.element).find(".popTip_content"),
                $minimized = $(this.element).find(".content_minimized"),
                oldWidth = $content.width(),
                oldHeight = $content.height(),
                oldLocation = options.location,
                changeLocation = (oldLocation !== "bottom");
            //只有location是bottom时候，最大化和最小化的动画效果比较好，所以在做最大化或者最小化前先设置location为bottom，最后再设置回来
            var setBottomLocation = function () {
                if (changeLocation) {
                    options.location = "bottom";
                    instance.setPosition();
                }
            };

            var restoreLocation = function () {
                if (changeLocation) {
                    options.location = oldLocation;
                    instance.setPosition();
                }
            };

            var showMinimized = function () {
                $element.addClass("minimized");
                $minimized.show();
                $content.hide();
            };

            var minimized = function () {
                showMinimized();
                restoreLocation();
                if (callback != null && (typeof callback === 'function')) {
                    callback();
                }
            };

            setBottomLocation();
            $content.css("width", oldWidth + "px")
                .css("height", oldHeight + "px").addClass("min")
                .data("oldWidth", oldWidth)
                .data("oldHeight", oldHeight);

            setTimeout(function () {
                $content.css("width", "0")
                    .css("height", "5px");
                var transitionEndEventName = $$.getTransitionEndEventName();
                if (transitionEndEventName != null) {
                    $content.one(transitionEndEventName, minimized);
                } else {
                    minimized();
                }
            }, 0);


        },

        maximize: function (callback) {
            var instance = this,
                options = this.options,
                $element = $(this.element),
                $content = $(this.element).find(".popTip_content"),
                $minimized = $element.find(".content_minimized"),
                oldWidth = $content.data("oldWidth"),
                oldHeight = $content.data("oldHeight"),
                oldLocation = options.location,
                changeLocation = (oldLocation !== "bottom");
            //只有location是bottom时候，最大化和最小化的动画效果比较好，所以在做最大化或者最小化前先设置location为bottom，最后再设置回来
            var setBottomLocation = function () {
                if (changeLocation) {
                    options.location = "bottom";
                    instance.setPosition();
                }
            };

            var restoreLocation = function () {
                if (changeLocation) {
                    options.location = oldLocation;
                    instance.setPosition();
                }
            };

            var maximized = function () {
                $content.removeClass("min");
                $content.css("width", "").css("height", "");
                if (options.onMaximized != null && typeof options.onMaximized === 'function') {
                    options.onMaximized();
                }
                restoreLocation();
                if (callback != null && (typeof callback === 'function')) {
                    callback();
                }
            };

            setBottomLocation();
            $element.removeClass("minimized");
            $minimized.hide();
            $content.show();
            setTimeout(function () {
                $content.css("width", oldWidth + "px")
                    .css("height", oldHeight + "px");
                var transitionEndEventName = $$.getTransitionEndEventName();
                if (transitionEndEventName != null) {
                    $content.one(transitionEndEventName, maximized);
                } else {
                    maximized()
                }
            }, 0);
        },

        changeContent: function (content) {
            $(this.element).children(".popTip_content").html(content);
            this.setPosition();
        },

        initEvents: function () {
            var instance = this,
                options = this.options,
                $element = $(this.element),
                $content = $(this.element).find(".popTip_content"),
                $minimized = $element.find(".content_minimized");

            if (options.content == null) {
                var showHoverText = function () {
                    if ($element.data("showHover") === true) return;
                    var $divText = $element.children(".tipText");
                    $divText.text(options.hoverText).addClass("hoverText");
                    var closeI = document.createElement("i");
                    $(closeI).addClass("i-icon-close2 infoplus_popTip_close")
                        .click(function () {
                            instance.close();
                        });
                    $element.append(closeI);
                    $element.data("showHover", true);

                    var maxZindex = 0;
                    $element.siblings(".popTip").each(function () {
                        var currentZindex = parseInt($(this).css("z-index"), 10);
                        if (!isNaN(currentZindex) && currentZindex > maxZindex) {
                            maxZindex = currentZindex;
                        }
                    });
                    $element.css("z-index", maxZindex + 1);

                };

                $element.hover(function () {
                    if (options.hoverText != null) {
                        showHoverText();
                    }
                });

                $element.click(function () {
                    if (typeof options.onClick === 'function') {
                        if (options.onClick() === true) {
                            instance.close();
                        }
                    } else {
                        if (options.hoverText == null) {
                            instance.close();
                        } else {
                            if ($element.data("showHover") === true) {
                                instance.close();
                            } else {
                                showHoverText();
                            }
                        }
                    }
                });
            }

            $minimized.click(function () {
                instance.maximize();
            });

            $element.on("mouseenter", function () {
                var oldZIndex = $element.css("z-index");
                if (oldZIndex != null) {
                    $element.data("oldZindex", oldZIndex);
                    if (oldZIndex === "auto") {
                        $element.css("z-index", 1);
                    } else {
                        $element.css("z-index", parseInt(oldZIndex, 10) + 1);
                    }

                }

                if (options.onMouseEnter != null && typeof options.onMouseEnter === 'function') {
                    options.onMouseEnter();
                }
            });


            $element.on("mouseleave", function () {
                if ($element.data("oldZindex") != null) {
                    $element.css("z-index", $element.data("oldZindex"));
                }
            });
        }


    });

    define("InfoPlus.Render.PopTip", tip);

})(window);
/**
 * 弹出菜单
 * @Author yech
 * @Since 2018/05/24
 */
(function (window, undefined) {
    /**
     * @param options 格式                           //创建参数
     * ｛
     *      container{HTMLElement}                  //弹出菜单的dom元素
     *      items:[{
     *          id:{string}                         //id
     *          text:{string}                       //显示文字
     *          iconClass:{string}                  //图标字体class
     *          link{boolean}                       //是否菜单上有链接，缺省false
     *          initVisible:{boolean}               //初始是否可见，缺省true
     *          switchItems:[{string}]              //点击后切换显示的item的id数组
     *          position:{string}                   //显示位置，缺省top-right
     *          horizontalMenuItem:{boolean}        //是否水平显示菜单项，缺省false
     *          click:{function}                    //点击事件
     *      }]
     *      initVisible:{boolean}                   //是否初始化可见，缺省false
     *  ｝
     */
    var popMenu = function (options) {
        this.id = $$.guid();
        InfoPlus.Theme.BaseComponent.call(this, options);
    };


    popMenu.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        show: function () {
            var options = this.options;
            if (options.items != null && typeof options.items === 'function') {
                var items = options.items.call(this);
                if (items.length > 0) {
                    this.createMenuItem(items);
                    $(this.element).show();
                }
                return;
            }
            $(this.element).show();
        },

        createMenuItem: function (items) {
            var options = this.options,
                instance = this,
                $element = $(this.element),
                $parent = $element.children("ul");
            $parent.empty();
            if (options['horizontalMenuItem'] === true) {
                $parent.addClass("horz");
            }
            for (var i = 0, len = items.length; i < len; i++) {
                var item = items[i],
                    li = document.createElement("li"),
                    $li = $(li);
                $li.attr("id", this.id + "_" + item.id).addClass("infoplus_popMenuItem");
                if (options['horizontalMenuItem'] === true) {
                    $li.addClass("horz");
                }
                var iconSpan = document.createElement("span"),
                    fontI = document.createElement("i");
                $(fontI).addClass(item.iconClass);
                $(iconSpan).append(fontI).addClass("infoplus_popMenuItemIcon");
                if (item.iconCss != null) {
                    $(iconSpan).attr("style", item.iconCss);
                }
                var textSpan = document.createElement("span");
                $(textSpan).text(item.text).addClass("infoplus_popMenuItemText");
                if (item.link === true) {
                    var link = document.createElement("a");
                    $(link).append(iconSpan).append(textSpan)
                        .attr("id", this.id + "_" + item.id + "_link").attr("href", "#").attr("target", "_blank");
                    $li.append(link);
                } else {
                    $li.append(iconSpan).append(textSpan);
                }

                $parent.append(li);
                if (item['initVisible'] === false) {
                    $li.hide();
                }
                if (item.click != null && typeof item.click === 'function') {
                    $li.click(function (menuItem) {
                        return function () {
                            instance.hide();
                            if (menuItem.switchItems != null) {
                                $element.find(".infoplus_popMenuItem").hide();
                                for (var index = 0, l = menuItem.switchItems.length; index < l; index++) {
                                    var id = instance.id + "_" + menuItem.switchItems[index];
                                    $element.find("#" + id).show();
                                }
                            }
                            return menuItem.click();
                        };
                    }(item));
                }
            }
        },

        showMenuItem: function (id) {
            var items = this.options.items;
            for (var i = 0, len = items.length; i < len; i++) {
                if (items[i].id === id) {

                    var $menuItem = $(this.element).find("#" + this.id + "_" + id);
                    //如果是水平方向的特殊处理一下，因为在ie下$menuItem.show会将display设置为list-item,变成了不是行内的元素
                    if ($menuItem.hasClass("horz")) {
                        $menuItem.css("display", "inline-block");
                    } else {
                        $menuItem.show();
                    }

                    return;
                }
            }
        },

        hideMenuItem: function (id) {
            var items = this.options.items;
            for (var i = 0, len = items.length; i < len; i++) {
                if (items[i].id === id) {
                    $(this.element).find("#" + this.id + "_" + id).hide();
                    return;
                }
            }
        },

        setMenuItemText: function (id, text) {
            var items = this.options.items;
            for (var i = 0, len = items.length; i < len; i++) {
                if (items[i].id === id) {
                    $(this.element).find("#" + this.id + "_" + id + " .infoplus_popMenuItemText").text(text);
                    return;
                }
            }
        },

        render: function () {
            var options = this.options;
            if (options.container == null) return null;
            var div = document.createElement("div"),
                $div = $(div),
                ul = document.createElement("ul");
            $div.attr("id", this.id).addClass("infoplus_popMenu").append(ul);
            var items = options.items;
            this.element = div;
            this.createMenuItem(items);

            //处理position选项
            if (options['position'] != null) {
                var pos = options['position'].split("-");
                for (var i = 0, len = pos.length; i < len; i++) {
                    $div.addClass(pos[i]);
                }
            }
            if ($$.MOBILE) {
                if ($(options.container).offset().left > ($(window).width() / 2)) {
                    $div.addClass("right").removeClass("left");
                }
            }

            $(options.container).append(div);
            if (!options.initVisible === true) {
                $div.hide();
            }
            return div;
        },

        showMenuItems: function (items) {
            var $element = $(this.element);
            $element.find(".infoplus_popMenuItem").hide();
            for (var index = 0, l = items.length; index < l; index++) {
                var id = this.id + "_" + items[index];
                $element.find("#" + id).show();
            }
        },

        initEvents: function () {
            var instance = this,
                options = this.options;

            if ($$.MOBILE) {
                $(options.container).on("touchstart", function () {
                    instance.show();
                });
            }

            $(options.container).on("mouseenter", function () {
                instance.show();
            });

            $(options.container).on("mouseleave", function () {
                instance.hide();
            });


        }


    });

    define("InfoPlus.Render.PopMenu", popMenu);

})(window);
/**
 * 弹出窗口
 * @Author yech
 * @Since 2018/10/18
 */
(function (window, undefined) {
    /**
     * @param options 格式                           //创建参数
     * ｛
     *      popper{HTMLElement}                     //弹出该tip的元素
     *      container{HTMLElement}                  //放置tip的dom元素
     *      content{string}                         //显示的内容,html格式
     *  ｝
     */
    var popWin = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    popWin.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        setPosition: function (element) {
            var options = this.options,
                $popper = $(options.popper),
                popperOffset = $popper.offset(),
                $container = $(options.container),
                containerOffset = $container.offset();

            if (!$popper.is(":visible")) {
                this.close();
                return;
            }
            var div = (element == null ? this.element : element),
                $div = $(div);

            var left = popperOffset.left - containerOffset.left;
            $div.css("left", left + "px");
            var top = popperOffset.top - containerOffset.top + $popper.outerHeight() + 2;
            $div.css("top", top + "px");
        },

        render: function () {
            var options = this.options;
            if (options.popper == null || !$(options.popper).is(":visible")) return null;
            if (options.container == null) {
                options.container = $$.params.renderContainer[0];
            }
            var $popper = $(options.popper),
                $container = $(options.container);

            var div = document.createElement("div"),
                $div = $(div);
            $div.addClass("popWin").attr("id", $$.guid());

            var divContent = document.createElement("div"),
                $divContent = $(divContent),
                content = options.content;
            $divContent.addClass("popWin_content");
            if (content instanceof jQuery) {
                content.detach().appendTo($divContent);
                if (!content.is(":visible")) {
                    content.show();
                }
            } else {
                $divContent.html(content);
            }
            $div.append(divContent);

            this.setPosition(div);
            $container.append(div);

            //获取最大z-index，设置tip最大z-index
            var maxZindex = 0;
            $popper.parents().each(function () {
                var currentZindex = parseInt($(this).css("z-index"), 10);
                if (!isNaN(currentZindex) && currentZindex > maxZindex) {
                    maxZindex = currentZindex;
                }
            });
            if (maxZindex !== 0) {
                $div.css("z-index", maxZindex);
            }

            $popper.data("popWin", this);
            $div.data("popWin", this);
            return div;
        },

        show: function () {
            if (!this.isOpen()) {
                $(this.element).addClass("popWin_open");
            }
        },

        close: function () {
            $(this.options.popper).removeData("popWin");
            $(this.element).remove();
            this.detachCloseHandler();
        },

        isOpen: function () {
            return $(this.element).hasClass("popWin_open");
        },

        changeContent: function (content) {
            $(this.element).children(".popWin_content").html(content);
            this.setPosition();
        },

        initEvents: function () {
            this.attachCloseHandler();
        },

        attachCloseHandler: function () {
            var id = $(this.element).attr("id");

            $(document.body).on('mousedown.popWin.' + id, function (e) {
                var $target = $(e.target);

                var $popWin = $target.closest('.popWin');

                var $all = $('.popWin.popWin_open');

                $all.each(function () {
                    var $this = $(this);

                    //如果点击在popWin里面就不处理
                    if (this === $popWin[0]) {
                        return;
                    }

                    var popWin = $this.data('popWin');
                    if (popWin.isOpen()) {
                        popWin.close();
                    }
                });
            });
        },


        detachCloseHandler: function () {
            $(document.body).off('mousedown.popWin.' + $(this.element).attr("id"));
        }


    });

    define("InfoPlus.Render.PopWin", popWin);

})(window);
/**
 * 页脚
 * @Author yech
 * @Since 2018/04/27
 */
(function (window, undefined) {
    /**
     * @param options 格式            //创建参数
     * ｛
     *  ｝
     */
    var footer = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    footer.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {


        render: function () {
            var masterDiv = document.createElement("div"),
                $masterDiv = $(masterDiv);

            $masterDiv.attr("id", "master_footer");

            var containerDiv = document.createElement("div"),
                $containerDiv = $(containerDiv);
            $containerDiv.append($("<div style=\"height:1px;background-color:#999999\"></div><div style=\"height:1px;background-color:#FFFFFF\"></div>"))
                .attr("id", "div_footer_copy_containers");

            var contentDiv = document.createElement("div"),
                $contentDiv = $(contentDiv);

            $contentDiv.html($$.params.copyright).attr("id", "div_footer_copy_content");
            $containerDiv.append(contentDiv);

            $masterDiv.append(containerDiv);
            return masterDiv;
        }

    });

    define("InfoPlus.Render.Footer", footer);

})(window);

/**
 * 相关用户显示窗口(抄送人查找窗口)
 * @Author yech
 * @Since 2018/10/19
 */
(function (window, undefined) {
    /**
     * @param options 格式                           //创建参数
     * ｛
     *     popper                                   //弹出该窗口的元素
     *     requestUrl                               //请求url
     *     requestData                              //请求参数,其中keyword内容用?替换
     *     dataEntityName                           //返回数据名称(目前可能是candidates,reviewers)
     *  ｝
     */
    var candidates = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };


    var KEYS = {
        TAB: 9,
        ESC: 27
    };

    candidates.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        requestFlag: null,
        lastRequestKeyword: null,

        requestData: function () {

            var getConvertedQueryKeyword = function (keyword) {
                keyword = keyword || "";
                keyword = keyword.replace('\\', '\\\\');
                keyword = keyword.replace('"', '\\"');
                return '"' + keyword + '"';
            };

            var self = this,
                options = this.options,
                keyword = getConvertedQueryKeyword($(this.searchInput).val()),
                query = options.requestData.replace("?", keyword),
                $resultList = $(this.resultList);
            this.lastRequestKeyword = $(this.searchInput).val();
            $resultList.empty();
            var li = document.createElement("li"),
                $li = $(li);
            $li.text($$.lt("candidates.searching"));
            $resultList.append(li);
            $.ajax({
                type: "POST",
                url: options.requestUrl,
                contentType: "application/json",
                data: $.toJSON({query: query})
            }).done(function (data) {
                if (data != null) {
                    if (data.errors != null) {
                        var message = $$.lt("candidates.error");
                        if ($IU.isArray(data.errors)) {
                            message = data.errors[0]['message'];
                            if (message.indexOf(":") !== -1) {
                                message = message.substr(message.indexOf(":") + 1);
                            }
                            $resultList.empty();
                            li = document.createElement("li");
                            $(li).text(message);
                            $resultList.append(li);
                        }
                    } else {
                        if (data['data'] != null && data['data'][options.dataEntityName]) {
                            $resultList.empty();
                            var users = data['data'][options.dataEntityName];
                            if (users.length > 0) {
                                for (var i = 0, len = users.length; i < len; i++) {
                                    var user = users[i];
                                    var text = user.name;
                                    if (!$IU.isEmptyStr(user.account)) {
                                        text += "(" + user.account + ")";
                                    }
                                    li = document.createElement("li");
                                    $li = $(li);
                                    $li.text(text).attr("title", text).data("user", user);
                                    $resultList.append(li);
                                    var email = user.email;
                                    if ($IU.isEmptyStr(email) && $$.params.synthesizeEmail &&
                                        !$IU.isEmptyStr($$.params.tenantDomain) && !$IU.isEmptyStr(user.account)) {
                                        email = user.account + "@" + $$.params.tenantDomain;
                                    }
                                    if (!$IU.isEmptyStr(email)) {
                                        var link = document.createElement("a"),
                                            icon = document.createElement("i");
                                        $(icon).addClass("i-icon-mail").data("email", email);
                                        $(link).append(icon).addClass("sendEmail").attr("href", "mailto:" + email).attr("title", $$.lt("candidates.mailto", user.name));
                                        $li.append(link);
                                    }
                                }
                            } else {
                                li = document.createElement("li");
                                $(li).text($$.lt("candidates.noResult"));
                                $resultList.append(li);
                            }
                            //触发相关用户查询事件
                            $$.candidatesQueried($resultList[0]);
                        }
                    }
                }

            });
            this.show();
        },

        init: function () {
            this.element = this.render();
            this.initEvents();
            this.requestData();
        },


        render: function () {
            var options = this.options;
            var containerDiv = document.createElement("div"),
                searchDiv = document.createElement("div"),
                searchInput = document.createElement("input"),
                $containerDiv = $(containerDiv),
                $searchInput = $(searchInput),
                $searchDiv = $(searchDiv),
                resultList = document.createElement("ul"),
                $resultList = $(resultList);

            $searchInput.addClass("candidatesSearchInput").attr("placeholder", $$.lt("candidates.searchKeyword")).data("control", this);
            $searchDiv.append(searchInput).addClass("candidatesSearchDiv");
            $containerDiv.append(searchDiv).append(resultList);
            $resultList.addClass("candidatesResult");

            var popWin = new InfoPlus.Render.PopWin({
                popper: options.popper,
                content: $containerDiv
            });

            this.searchInput = searchInput;
            this.resultList = resultList;
            this.popWin = popWin;
            return popWin.element;
        },

        show: function () {
            this.popWin.show();
        },

        close: function () {
            this.popWin.close();
        },

        initEvents: function () {
            $(this.searchInput).on("keyup", function (event) {
                var control = $(this).data("control");
                var key = event.which;
                if (key === KEYS.ESC) {
                    control.close();
                    return false;
                }
                if (control.lastRequestKeyword !== $(this).val()) {
                    if (control.requestFlag != null) {
                        clearTimeout(control.requestFlag);
                    }
                    control.requestFlag = setTimeout(function () {
                        control.requestData();
                    }, 300);
                }

            });
        }


    });

    define("InfoPlus.Render.Candidates", candidates);

})(window);
/**
 * 发起按钮
 * @Author yech
 * @Since 2016/04/20
 */
(function (window, undefined) {
    /**
     * @param options 格式                //创建参数
     *  {
     *      startable:{boolean}(true)    //是否可以发起
     *      onClick:{function}           //发起按钮点击回调函数
     *  }
     */
    var start = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    start.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {
        render: function () {
            var options = this.options;

            var startSpan = document.createElement("span");
            startSpan.setAttribute("id", "preview_start_span");
            var startLink = document.createElement("a");
            $(startLink).attr("id", "preview_start_button").text($$.lt("preview.startButtonText"));
            startSpan.appendChild(startLink);
            this.startLink = startLink;

            if (options.startable === false) {
                $(startSpan).hide();
            }

            return startSpan;
        },

        initEvents: function () {
            var options = this.options;
            if (options.onClick != null && typeof options.onClick === "function") {
                $(this.startLink).click(options.onClick);
            }
        },

        show: function () {
            if (this.options.startable !== false) {
                $(this.element).show();
            }
        }
    });


    define("InfoPlus.Preview.Start", start);

})(window);

/**
 * 流程介绍
 * @Author yech
 * @Since 2016/04/20
 */
(function (window, undefined) {
    /**
     * @param options 格式           //创建参数
     * {
     *   hide:{boolean}(true)       //是否隐藏
     *   app:{app}                  //流程app对象
     * }
     */
    var introduce = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    introduce.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {

        render: function () {
            var app = this.options.app;

            var layoutDiv = document.createElement("div");

            var containerDiv = document.createElement("div");
            containerDiv.setAttribute("id", "introduce_container");

            //添加图标
            var iconDiv = document.createElement("div");
            iconDiv.setAttribute("id", "introduce_icon_container");
            var img = document.createElement("img");
            img.setAttribute("id", "preview_app_icon");
            img.setAttribute("src", app.iconUrl);
            if (app.iconPalette != null && app.iconPalette !== '') {
                $(img).css("background-color", app.iconPalette);
            } else {
                //如果是缺省图标，那么用透明背景，这个其实是和缺省图标是有关的，目前缺省图标白底，如果是本身透明，那不用设置
                if (app.iconUrl.indexOf("default_workflow_icon") !== -1) {
                    $(img).css("background-color", "transparent");
                }
            }
            iconDiv.appendChild(img);
            containerDiv.appendChild(iconDiv);

            //添加简介
            var infoDiv = document.createElement("div");
            infoDiv.setAttribute("id", "introduce_info_container");

            var div = document.createElement("div");
            $(div).addClass("introduce_name").text(app.name);
            infoDiv.appendChild(div);

            /*
            div = document.createElement("div");
            var labelDiv = document.createElement("div");
            $(labelDiv).addClass("label").text($$.lt("preview.department"));
            var contentDiv = document.createElement("div");
            $(contentDiv).addClass("introduce_department").text(app.department || "　");
            $(div).addClass("introduce_line").append(labelDiv).append(contentDiv);
            infoDiv.appendChild(div);

            div = document.createElement("div");
            labelDiv = document.createElement("div");
            $(labelDiv).addClass("label").text($$.lt("preview.contact"));
            contentDiv = document.createElement("div");
            $(contentDiv).addClass("introduce_contact").text(app.contact || "　");
            $(div).addClass("introduce_line").append(labelDiv).append(contentDiv);
            infoDiv.appendChild(div);

            */

            div = document.createElement("div");
            $(div).addClass("introduce_content");
            infoDiv.appendChild(div);

            $(div).append("<table><tr><td class='introduce_label'>" + $$.lt("preview.department") + "</td><td class='introduce_department'>" +
                (app.department || "　") + "</td></tr><tr><td class='introduce_empty_line'></td><td></td></td></tr></tr>" +
                "<tr><td class='introduce_label'>" + $$.lt("preview.contact") + "</td>" +
                "<td class='introduce_contact'>" + (app.contact || "　") + "</td></tr></table>");


            //添加评分
            div = document.createElement("div");
            var ratingSpan = document.createElement("span");
            var startDiv = document.createElement("div");
            var starContainerDiv = document.createElement("div");
            var scoreDiv = document.createElement("div");
            $(scoreDiv).addClass("rating_score").css("width", app.rating + "%");
            $(starContainerDiv).addClass("star_container").append(scoreDiv);
            $(startDiv).addClass("rating_star").append(starContainerDiv);

            var ratedSpan = document.createElement("span");
            var countSpan = document.createElement("span");
            $(countSpan).addClass("rated_count").text($$.lt("preview.rateCount", app.rated));
            $(ratedSpan).addClass("rated").append(countSpan);

            $(ratingSpan).addClass("introduce_rating").append(startDiv).append(ratedSpan);
            $(div).addClass("introduce_line").append(ratingSpan);
            infoDiv.appendChild(div);

            containerDiv.appendChild(infoDiv);

            $(layoutDiv).attr("id", "preview_introduce").css("display", "none").append(containerDiv);
            return layoutDiv;
        },

        show: function () {
            if (this.options.hide !== true) {
                $(this.element).show();
            }
        }

    });

    define("InfoPlus.Preview.Introduce", introduce);

})(window);
/**
 * 预览页布局
 * @Author yech
 * @Since 2016/04/20
 */
(function (window, undefined) {

    /**
     * @param options 格式               //创建参数
     * ｛
     *      views:[{view}]              //预览页上所有的view对象
     *      introduce:{introduce}       //简介对象
     *      start:{start}               //发起按钮
     *  ｝
     */
    var layout = function (options) {
        InfoPlus.Theme.BaseComponent.call(this, options);
    };

    layout.prototype = $.extend(new InfoPlus.Theme.BaseComponent(), {
        render: function () {

            var options = this.options,
                views = options.views,
                introduce = options.introduce,
                start = options.start;

            if (views == null || introduce == null || start == null) {
                return;
            }

            //创建上一页按钮
            var createPreviousButton = function (viewDom, introduceDom) {
                var span = document.createElement("span"),
                    button = document.createElement("a");
                $(button).addClass("preview_previous_button").attr("href", "#").text($$.lt("preview.previous"))
                    .data("viewDom", viewDom).data("introduceDom", introduceDom);
                $(span).append(button);

                return span;
            };

            //创建下一页按钮
            var createNextButton = function (viewDom, introduceDom) {
                var span = document.createElement("span"),
                    button = document.createElement("a");
                $(button).addClass("preview_next_button").attr("href", "#").text($$.lt("preview.next"))
                    .data("viewDom", viewDom).data("introduceDom", introduceDom);
                $(span).append(button);
                return span;
            };


            var introduceDom = introduce.getElement(),
                $introduceDom = $(introduceDom),
                startDom = start.getElement(),
                $startDom = $(startDom);

            for (var i = 0, len = views.length; i < len; i++) {
                var viewDom = views[i].element,
                    $viewDom = $(viewDom),
                    isFirstView = (i === 0),
                    isLastView = (i === len - 1);

                if (isFirstView) {
                    $viewDom.prepend($introduceDom);
                }
                $viewDom.addClass("preview_view");

                var commandBarDiv = document.createElement("div");
                $(commandBarDiv).addClass("preview_command_bar");

                if (isLastView) {
                    $(commandBarDiv).append($startDom);
                    if (!isFirstView) {
                        if (startDom != null) {
                            $startDom.before(createPreviousButton(viewDom, introduceDom));
                        } else {
                            $(commandBarDiv).append(createPreviousButton(viewDom, introduceDom));
                        }
                    }
                } else {
                    if (!isFirstView) {
                        $(commandBarDiv).append(createPreviousButton(viewDom, introduceDom));
                    }
                    $(commandBarDiv).append(createNextButton(viewDom, introduceDom));
                }
                $viewDom.append(commandBarDiv);
                introduce.show();

                if (!isFirstView) {
                    $viewDom.hide();
                }
            }

            if ($("#header_holder").length === 0) {
                $("#renderContent_holder").addClass("no_header");
            }


            return null;
        },

        initEvents: function () {
            //处理上一页点击事件
            $(".preview_previous_button").click(function () {
                var $view = $($(this).data("viewDom")),
                    $prevView = $view.prev(".infoplus_view"),
                    $introduce = $($(this).data("introduceDom"));
                $view.fadeOut(function () {
                    $($prevView).prepend($introduce);
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                    $prevView.fadeIn();
                });
                return false;
            });

            //处理下一页点击事件
            $(".preview_next_button").click(function () {
                var $view = $($(this).data("viewDom")),
                    $nextView = $view.next(".infoplus_view"),
                    $introduce = $($(this).data("introduceDom"));
                $view.fadeOut(function () {
                    $($nextView).prepend($introduce);
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                    $nextView.fadeIn();
                });
                return false;
            });
        }
    });

    define("InfoPlus.Preview.Layout", layout);

})(window);

